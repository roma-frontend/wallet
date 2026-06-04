import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./helpers";
import { transactionType, recurrence } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.string(),
    recurrence,
    tags: v.optional(v.array(v.string())),
    splits: v.optional(
      v.array(
        v.object({
          categoryId: v.optional(v.id("categories")),
          amount: v.number(),
          note: v.optional(v.string()),
        }),
      ),
    ),
    receiptId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const id = await ctx.db.insert("transactions", { ...args, userId });
    // Fire-and-forget Telegram notifications (respects the user's toggles).
    await ctx.scheduler.runAfter(0, internal.notifications.notifyTransactionAdded, {
      userId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      categoryId: args.categoryId,
      note: args.note,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    type: v.optional(transactionType),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.optional(v.string()),
    recurrence: v.optional(recurrence),
    tags: v.optional(v.array(v.string())),
    splits: v.optional(
      v.array(
        v.object({
          categoryId: v.optional(v.id("categories")),
          amount: v.number(),
          note: v.optional(v.string()),
        }),
      ),
    ),
    receiptId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const tx = await ctx.db.get(id);
    if (!tx || tx.userId !== userId) throw new Error("Չգտնված գործարք");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const tx = await ctx.db.get(id);
    if (!tx || tx.userId !== userId) throw new Error("Չգտնված գործարք");
    if (tx.receiptId) await ctx.storage.delete(tx.receiptId);
    await ctx.db.delete(id);
  },
});

/**
 * Bulk-append transactions parsed from a CSV file. Categories and accounts are
 * matched by name (case-insensitive); missing categories are created on the
 * fly. Existing data is never deleted. Returns how many rows were inserted.
 */
export const importCsv = mutation({
  args: {
    rows: v.array(
      v.object({
        date: v.string(),
        type: transactionType,
        amount: v.number(),
        currency: v.string(),
        categoryName: v.optional(v.string()),
        accountName: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    const userId = await requireUser(ctx);
    if (rows.length === 0) return { inserted: 0 };

    const [categories, accounts] = await Promise.all([
      ctx.db.query("categories").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("accounts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const accByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a._id]));

    let inserted = 0;
    for (const row of rows) {
      let categoryId = undefined;
      if (row.categoryName) {
        const key = row.categoryName.toLowerCase();
        let cat = catByName.get(key);
        if (!cat) {
          const id = await ctx.db.insert("categories", {
            userId,
            name: row.categoryName,
            icon: "tag",
            color: "#64748b",
            type: row.type,
            isDefault: false,
          });
          cat = { _id: id } as (typeof categories)[number];
          catByName.set(key, cat);
        }
        categoryId = cat._id;
      }

      const accountId = row.accountName ? accByName.get(row.accountName.toLowerCase()) : undefined;

      await ctx.db.insert("transactions", {
        userId,
        type: row.type,
        amount: row.amount,
        currency: row.currency,
        categoryId,
        accountId,
        note: row.note,
        date: row.date,
        recurrence: "none",
      });
      inserted++;
    }
    return { inserted };
  },
});
