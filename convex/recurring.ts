import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./helpers";
import { transactionType } from "./schema";

const interval = v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly"));

function advanceISO(iso: string, every: "weekly" | "monthly" | "yearly"): string {
  const d = new Date(iso + "T00:00:00Z");
  if (every === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (every === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("recurring")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("categories")),
    note: v.optional(v.string()),
    interval,
    dayOfMonth: v.number(),
    nextDate: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("recurring", { ...args, userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("recurring"),
    type: v.optional(transactionType),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    note: v.optional(v.string()),
    interval: v.optional(interval),
    dayOfMonth: v.optional(v.number()),
    nextDate: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const r = await ctx.db.get(id);
    if (!r || r.userId !== userId) throw new Error("Չգտնված պարբերական վճար");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("recurring") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const r = await ctx.db.get(id);
    if (!r || r.userId !== userId) throw new Error("Չգտնված պարբերական վճար");
    await ctx.db.delete(id);
  },
});

/**
 * Cron entry point: materialise every active recurring payment whose nextDate
 * has arrived into a real transaction, then advance nextDate. Runs daily and
 * catches up if several periods were missed.
 */
export const materializeDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db.query("recurring").collect();
    let created = 0;

    for (const r of all) {
      if (!r.active) continue;
      let nextDate = r.nextDate;
      let guard = 0;
      while (nextDate <= today && guard < 60) {
        await ctx.db.insert("transactions", {
          userId: r.userId,
          type: r.type,
          amount: r.amount,
          currency: r.currency,
          categoryId: r.categoryId,
          note: r.note,
          date: nextDate,
          recurrence: "none",
        });
        created++;
        nextDate = advanceISO(nextDate, r.interval);
        guard++;
      }
      if (nextDate !== r.nextDate) {
        await ctx.db.patch(r._id, { nextDate });
      }
    }

    return { created };
  },
});
