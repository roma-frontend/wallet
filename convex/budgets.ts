import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    categoryId: v.id("categories"),
    amount: v.number(),
    rollover: v.optional(v.boolean()),
  },
  handler: async (ctx, { categoryId, amount, rollover }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_user_category", (q) => q.eq("userId", userId).eq("categoryId", categoryId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { amount, rollover });
      return existing._id;
    }
    return await ctx.db.insert("budgets", { userId, categoryId, amount, rollover });
  },
});

export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const b = await ctx.db.get(id);
    if (!b || b.userId !== userId) throw new Error("Չգտնված բյուջե");
    await ctx.db.delete(id);
  },
});
