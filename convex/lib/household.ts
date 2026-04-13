import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * If the user belongs to a household, return the admin's userId.
 * Otherwise return their own userId.
 * This ensures all data (purchases, readings) is keyed by the admin's userId,
 * so all household members share the same meter data.
 */
export async function resolveEffectiveUserId(
  ctx: QueryCtx | MutationCtx,
  userId: string
): Promise<string> {
  const membership = await ctx.db
    .query("household_members")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!membership) return userId;

  const household = await ctx.db.get(membership.householdId);
  if (!household) return userId;

  return household.adminUserId;
}
