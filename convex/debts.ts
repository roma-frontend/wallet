import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

const debtKind = v.union(v.literal("owe"), v.literal("lent"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("debts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    kind: debtKind,
    principal: v.number(),
    paid: v.optional(v.number()),
    currency: v.string(),
    counterparty: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
    icon: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("debts", {
      ...args,
      paid: args.paid ?? 0,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("debts"),
    name: v.optional(v.string()),
    kind: v.optional(debtKind),
    principal: v.optional(v.number()),
    paid: v.optional(v.number()),
    currency: v.optional(v.string()),
    counterparty: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId) throw new Error("Չգտնված պարտք");
    await ctx.db.patch(id, patch);
  },
});

/** Log a payment that reduces the outstanding balance (clamped to principal). */
export const addPayment = mutation({
  args: { id: v.id("debts"), amount: v.number() },
  handler: async (ctx, { id, amount }) => {
    const userId = await requireUser(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId) throw new Error("Չգտնված պարտք");
    const paid = Math.max(0, Math.min(debt.principal, debt.paid + amount));
    await ctx.db.patch(id, { paid });
  },
});

export const remove = mutation({
  args: { id: v.id("debts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId) throw new Error("Չգտնված պարտք");
    await ctx.db.delete(id);
  },
});
