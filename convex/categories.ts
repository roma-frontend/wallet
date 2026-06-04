import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { transactionType } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    type: transactionType,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("categories", { ...args, userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const cat = await ctx.db.get(id);
    if (!cat || cat.userId !== userId) throw new Error("Չգտնված կատեգորիա");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const cat = await ctx.db.get(id);
    if (!cat || cat.userId !== userId) throw new Error("Չգտնված կատեգորիա");

    // Detach transactions and delete related budgets.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const t of txs) {
      if (t.categoryId === id) await ctx.db.patch(t._id, { categoryId: undefined });
    }
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user_category", (q) => q.eq("userId", userId).eq("categoryId", id))
      .collect();
    for (const b of budgets) await ctx.db.delete(b._id);

    await ctx.db.delete(id);
  },
});
