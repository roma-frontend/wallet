import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

/** Generate a short-lived upload URL for a receipt photo (auth required). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a stored file id to a served URL (or null if missing). */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});
