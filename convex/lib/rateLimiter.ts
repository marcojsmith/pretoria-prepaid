import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { ConvexError } from "convex/values";

const WRITES_PER_MINUTE = 60;
const SYNC_PER_MINUTE = 20;
const ONE_MINUTE_MS = 60_000;

export const RATE_LIMITS = {
  addPurchase: { limit: WRITES_PER_MINUTE, windowMs: ONE_MINUTE_MS },
  deletePurchase: { limit: WRITES_PER_MINUTE, windowMs: ONE_MINUTE_MS },
  syncUser: { limit: SYNC_PER_MINUTE, windowMs: ONE_MINUTE_MS },
  addOnboardingReading: { limit: WRITES_PER_MINUTE, windowMs: ONE_MINUTE_MS },
  correctMeterReading: { limit: WRITES_PER_MINUTE, windowMs: ONE_MINUTE_MS },
} as const;

export interface CheckRateLimitOptions {
  ctx: MutationCtx;
  userId: string;
  action: string;
  limit: number;
  windowMs: number;
}

/**
 * Sliding window rate limiter for Convex mutations.
 * @param options - The options object containing ctx, userId, action, limit, and windowMs
 */
export async function checkRateLimit(options: CheckRateLimitOptions): Promise<void> {
  const { ctx, userId, action, limit, windowMs } = options;
  const now = Date.now();

  const existingRow = await ctx.db
    .query("rate_limits")
    .withIndex("by_userId_action", (q) => q.eq("userId", userId).eq("action", action))
    .unique();

  if (!existingRow) {
    await ctx.db.insert("rate_limits", {
      userId,
      action,
      windowStart: now,
      count: 1,
    });
    return;
  }

  if (existingRow.windowStart + windowMs < now) {
    // Window expired — reset in-place to avoid duplicate rows violating .unique()
    await ctx.db.patch(existingRow._id, { windowStart: now, count: 1 });
    return;
  }

  if (existingRow.count >= limit) {
    throw new ConvexError(`Rate limit exceeded for ${action}. Try again later.`);
  }

  await ctx.db.patch(existingRow._id, {
    count: existingRow.count + 1,
  });
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const purgeStaleRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = now - STALE_THRESHOLD_MS;

    const staleRows = await ctx.db
      .query("rate_limits")
      .filter((q) => q.lt(q.field("windowStart"), staleThreshold))
      .collect();

    for (const row of staleRows) {
      await ctx.db.delete(row._id);
    }

    return { deletedCount: staleRows.length };
  },
});
