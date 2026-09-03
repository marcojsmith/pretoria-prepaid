import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const TAKE_MEMBERSHIPS = 1;
const TAKE_HOUSEHOLD_METERS = 10;

/**
 * Returns the caller's membership record for a given household, or null if
 * they are not a member. Uses the composite `by_householdId_userId` index.
 *
 * Signature fixed by the multi-meter phase 1 spec (ctx, householdId, userId).
 */
// eslint-disable-next-line llm-core/max-params
export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  userId: string
): Promise<Doc<"household_members"> | null> {
  return await ctx.db
    .query("household_members")
    .withIndex("by_householdId_userId", (q) =>
      q.eq("householdId", householdId).eq("userId", userId)
    )
    .unique();
}

async function resolveExplicitMeter(options: {
  ctx: QueryCtx | MutationCtx;
  userId: string;
  meterId: Id<"meters">;
}): Promise<Doc<"meters">> {
  const { ctx, userId, meterId } = options;
  const meter = await ctx.db.get(meterId);
  if (!meter || meter.archived) {
    throw new Error("Unauthorized");
  }
  const membership = await getMembership(ctx, meter.householdId, userId);
  if (!membership) {
    throw new Error("Unauthorized");
  }
  return meter;
}

async function resolveActiveMeter(
  ctx: QueryCtx | MutationCtx,
  userId: string
): Promise<Doc<"meters"> | null> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (profile?.activeMeterId) {
    const meter = await ctx.db.get(profile.activeMeterId);
    if (meter && !meter.archived) {
      const membership = await getMembership(ctx, meter.householdId, userId);
      if (membership) return meter;
    }
  }

  const memberships = await ctx.db
    .query("household_members")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(TAKE_MEMBERSHIPS);

  const membership = memberships[0];
  if (!membership) return null;

  const meters = await ctx.db
    .query("meters")
    .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
    .take(TAKE_HOUSEHOLD_METERS);

  return meters.find((m) => !m.archived) ?? null;
}

/**
 * Resolves the meter a caller should operate on.
 * - If `meterId` is given, it must exist, be non-archived, and the caller must
 *   have membership in its household; otherwise throws `Unauthorized`.
 * - Else falls back to the caller's `profile.activeMeterId` (if valid), then
 *   the first non-archived meter in the caller's first household membership.
 * - Never writes; safe to call from queries.
 *
 * Signature fixed by the multi-meter phase 1 spec (ctx, userId, meterId?).
 */
// eslint-disable-next-line llm-core/max-params
export async function resolveMeter(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  meterId?: Id<"meters">
): Promise<Doc<"meters"> | null> {
  if (meterId) {
    return await resolveExplicitMeter({ ctx, userId, meterId });
  }
  return await resolveActiveMeter(ctx, userId);
}

/**
 * Requires that the caller is an admin member of the given household.
 * Throws `Error("Not a household admin")` otherwise.
 *
 * Signature fixed by the multi-meter phase 1 spec (ctx, householdId, userId).
 */
// eslint-disable-next-line llm-core/max-params
export async function requireHouseholdAdmin(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
  userId: string
): Promise<Doc<"household_members">> {
  const membership = await getMembership(ctx, householdId, userId);
  if (!membership || membership.role !== "admin") {
    throw new Error("Not a household admin");
  }
  return membership;
}

async function findHouseholdMeter(
  ctx: MutationCtx,
  householdId: Id<"households">
): Promise<Doc<"meters"> | null> {
  const meters = await ctx.db
    .query("meters")
    .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
    .take(TAKE_HOUSEHOLD_METERS);
  return meters.find((m) => !m.archived) ?? null;
}

async function createMeterForHousehold(options: {
  ctx: MutationCtx;
  householdId: Id<"households">;
  profile: Doc<"profiles">;
}): Promise<Id<"meters">> {
  const { ctx, householdId, profile } = options;
  const meter: {
    householdId: Id<"households">;
    name: string;
    createdAt: number;
    meterNumber?: string;
    lowBalanceThreshold?: number;
    defaultDailyUsage?: number;
    lastAlertSent?: number;
  } = {
    householdId,
    name: "Home",
    createdAt: Date.now(),
  };
  if (profile.meterNumber !== undefined) meter.meterNumber = profile.meterNumber;
  if (profile.lowBalanceThreshold !== undefined)
    meter.lowBalanceThreshold = profile.lowBalanceThreshold;
  if (profile.defaultDailyUsage !== undefined) meter.defaultDailyUsage = profile.defaultDailyUsage;
  if (profile.lastAlertSent !== undefined) meter.lastAlertSent = profile.lastAlertSent;

  return await ctx.db.insert("meters", meter);
}

async function setActiveMeterIfUnset(options: {
  ctx: MutationCtx;
  profile: Doc<"profiles">;
  meterId: Id<"meters">;
}): Promise<void> {
  const { ctx, profile, meterId } = options;
  if (!profile.activeMeterId) {
    await ctx.db.patch(profile._id, { activeMeterId: meterId });
  }
}

async function ensureForExistingMembership(options: {
  ctx: MutationCtx;
  membership: Doc<"household_members">;
  profile: Doc<"profiles">;
}): Promise<Id<"meters"> | null> {
  const { ctx, membership, profile } = options;
  const existingMeter = await findHouseholdMeter(ctx, membership.householdId);
  if (existingMeter) {
    await setActiveMeterIfUnset({ ctx, profile, meterId: existingMeter._id });
    return existingMeter._id;
  }

  if (membership.role !== "admin") {
    // Non-admin member of a household with no meter yet — nothing we can
    // resolve or create on their behalf. Callers (notably the migration)
    // should skip cleanly rather than treat this as an error.
    return null;
  }

  const meterId = await createMeterForHousehold({
    ctx,
    householdId: membership.householdId,
    profile,
  });
  await setActiveMeterIfUnset({ ctx, profile, meterId });
  return meterId;
}

async function createPersonalHouseholdAndMeter(options: {
  ctx: MutationCtx;
  userId: string;
  profile: Doc<"profiles">;
}): Promise<Id<"meters">> {
  const { ctx, userId, profile } = options;
  const householdId = await ctx.db.insert("households", {
    adminUserId: userId,
    name: "My Home",
    createdAt: Date.now(),
  });
  await ctx.db.insert("household_members", {
    householdId,
    userId,
    role: "admin",
    joinedAt: Date.now(),
  });
  const meterId = await createMeterForHousehold({ ctx, householdId, profile });
  await setActiveMeterIfUnset({ ctx, profile, meterId });
  return meterId;
}

/**
 * Ensures the given user has a resolvable meter, creating a personal
 * household + meter if they have no membership at all. Idempotent.
 *
 * - Existing admin/no-membership user: household+meter created/reused, and
 *   `profile.activeMeterId` set if unset.
 * - Existing non-admin member of a household with no meter yet: returns
 *   `null` rather than throwing, since there's nothing safe to create on
 *   their behalf (only admins may add meters).
 *
 * Signature fixed by the multi-meter phase 1 spec (ctx, userId, profile).
 */
// eslint-disable-next-line llm-core/max-params
export async function ensurePersonalHouseholdAndMeter(
  ctx: MutationCtx,
  userId: string,
  profile: Doc<"profiles">
): Promise<Id<"meters"> | null> {
  const memberships = await ctx.db
    .query("household_members")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(TAKE_MEMBERSHIPS);
  const membership = memberships[0];

  if (membership) {
    return await ensureForExistingMembership({ ctx, membership, profile });
  }

  return await createPersonalHouseholdAndMeter({ ctx, userId, profile });
}
