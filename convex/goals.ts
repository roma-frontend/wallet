import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    target: v.number(),
    saved: v.number(),
    deadline: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("goals", { ...args, userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("goals"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    target: v.optional(v.number()),
    saved: v.optional(v.number()),
    deadline: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUser(ctx);
    const g = await ctx.db.get(id);
    if (!g || g.userId !== userId) throw new Error("Չգտնված նպատակ");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const g = await ctx.db.get(id);
    if (!g || g.userId !== userId) throw new Error("Չգտնված նպատակ");
    await ctx.db.delete(id);
  },
});
