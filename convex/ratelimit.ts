import { v } from "convex/values";
import { mutation } from "./_generated/server";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;

/**
 * Persistent fixed-window rate limiter, keyed by `route:ip`.
 * Survives serverless cold starts (unlike the in-memory fallback in
 * src/lib/ratelimit.ts). Returns { allowed, reset } where reset is seconds.
 */
export const check = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!existing) {
      await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
      return { allowed: true, reset: 0 };
    }

    // Window expired → reset the counter.
    if (now - existing.windowStart >= WINDOW_MS) {
      await ctx.db.patch(existing._id, { count: 1, windowStart: now });
      return { allowed: true, reset: 0 };
    }

    if (existing.count >= MAX_HITS) {
      const reset = Math.ceil((WINDOW_MS - (now - existing.windowStart)) / 1000);
      return { allowed: false, reset };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true, reset: 0 };
  },
});
