/**
 * Rate limiter for API routes.
 *
 * Primary: a persistent fixed-window counter stored in Convex, so the limit
 * holds across serverless cold starts / multiple instances.
 * Fallback: an in-memory sliding window (used when Convex is unreachable or
 * NEXT_PUBLIC_CONVEX_URL is unset), good enough for local/single-instance use.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;

const buckets = new Map<string, number[]>();

function checkInMemory(key: string): { allowed: boolean; reset: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_HITS) {
    const reset = Math.ceil((WINDOW_MS - (now - hits[0])) / 1000);
    return { allowed: false, reset };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, reset: 0 };
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

/**
 * Synchronous in-memory check — kept for callers that can't await.
 * Prefer {@link checkRateLimitAsync} in API routes.
 */
export function checkRateLimit(key: string): { allowed: boolean; reset: number } {
  return checkInMemory(key);
}

/** Persistent Convex-backed check, falling back to in-memory on any error. */
export async function checkRateLimitAsync(
  key: string,
): Promise<{ allowed: boolean; reset: number }> {
  if (!client) return checkInMemory(key);
  try {
    return await client.mutation(api.ratelimit.check, { key });
  } catch {
    return checkInMemory(key);
  }
}
