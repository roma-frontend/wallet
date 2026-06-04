import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { accountType } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    type: accountType,
    currency: v.string(),
    initialBalance: v.number(),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const count = (
      await ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).length;
    return await ctx.db.insert("accounts", { ...args, userId, order: count });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    type: v.optional(accountType),
    currency: v.optional(v.string()),
    initialBalance: v.optional(v.number()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const acc = await ctx.db.get(id);
    if (!acc || acc.userId !== userId) throw new Error("Հաշիվը չգտնվեց");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const acc = await ctx.db.get(id);
    if (!acc || acc.userId !== userId) throw new Error("Հաշիվը չգտնվեց");

    // Detach transactions and remove related transfers so balances stay sane.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const tx of txs) {
      if (tx.accountId === id) await ctx.db.patch(tx._id, { accountId: undefined });
    }
    const transfers = await ctx.db
      .query("transfers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const t of transfers) {
      if (t.fromAccountId === id || t.toAccountId === id) await ctx.db.delete(t._id);
    }

    await ctx.db.delete(id);
  },
});

/* ── Transfers ── */

export const listTransfers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("transfers")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addTransfer = mutation({
  args: {
    fromAccountId: v.id("accounts"),
    toAccountId: v.id("accounts"),
    amount: v.number(),
    currency: v.string(),
    date: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (args.fromAccountId === args.toAccountId) {
      throw new Error("Հաշիվները պետք է տարբեր լինեն");
    }
    const from = await ctx.db.get(args.fromAccountId);
    const to = await ctx.db.get(args.toAccountId);
    if (!from || from.userId !== userId || !to || to.userId !== userId) {
      throw new Error("Հաշիվը չգտնվեց");
    }
    return await ctx.db.insert("transfers", { ...args, userId });
  },
});

export const removeTransfer = mutation({
  args: { id: v.id("transfers") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(id);
    if (!t || t.userId !== userId) throw new Error("Փոխանցումը չգտնվեց");
    await ctx.db.delete(id);
  },
});
