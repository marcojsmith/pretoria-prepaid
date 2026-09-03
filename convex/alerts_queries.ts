import { internalQuery, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { MAX_ALERT_PURCHASES } from "./constants";
import { resolveEffectiveUserId } from "./lib/household";
import { resolveMeter } from "./lib/meters";
import type { Doc } from "./_generated/dataModel";

/**
 * Bound on the number of non-archived meters / household members scanned per
 * cron tick, expressed as a bounded pagination loop (not a flat `.take()`).
 * A flat `.take(n)` would deterministically return only the OLDEST `n` rows
 * (Convex's default order is ascending `_creationTime`), permanently
 * excluding anything created after the table grew past `n`. Paginating in a
 * loop up to `SCAN_LIMIT` avoids that: growth past the household norm is
 * still bounded (and logged), but every row gets a chance to be seen across
 * cron ticks rather than being silently and permanently dropped.
 */
const SCAN_LIMIT = 5000;
const SCAN_BATCH = 500;

/**
 * Internal query to fetch all non-archived meters, scanning up to
 * `SCAN_LIMIT` rows via bounded pagination. Logs if the scan limit is hit so
 * growth past it is visible rather than silently dropping meters from alert
 * checks.
 */
export const getMetersForAlerts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const nonArchived: Doc<"meters">[] = [];
    let cursor: string | null = null;
    let scanned = 0;
    let isDone = false;

    while (scanned < SCAN_LIMIT) {
      const page = await ctx.db.query("meters").paginate({ cursor, numItems: SCAN_BATCH });
      for (const meter of page.page) {
        if (!meter.archived) {
          nonArchived.push(meter);
        }
      }
      scanned += page.page.length;
      isDone = page.isDone;
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    if (!isDone && scanned >= SCAN_LIMIT) {
      console.error("getMetersForAlerts hit SCAN_LIMIT", { scanLimit: SCAN_LIMIT });
    }
    return nonArchived;
  },
});

/**
 * Internal query returning the profiles of household members subscribed to
 * push notifications for the given meter's household. Scans up to
 * `SCAN_LIMIT` household members via bounded pagination.
 */
export const getMeterAlertRecipients = internalQuery({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const recipients: Doc<"profiles">[] = [];
    let cursor: string | null = null;
    let scanned = 0;
    let isDone = false;

    while (scanned < SCAN_LIMIT) {
      const page = await ctx.db
        .query("household_members")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .paginate({ cursor, numItems: SCAN_BATCH });

      for (const member of page.page) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", member.userId))
          .unique();
        if (profile?.pushNotificationsEnabled && profile.pushSubscription) {
          recipients.push(profile);
        }
      }

      scanned += page.page.length;
      isDone = page.isDone;
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    if (!isDone && scanned >= SCAN_LIMIT) {
      console.error("getMeterAlertRecipients hit SCAN_LIMIT", {
        householdId: args.householdId,
        scanLimit: SCAN_LIMIT,
      });
    }
    return recipients;
  },
});

/**
 * Internal query to fetch stats for a specific user (legacy, pre-meter
 * fallback path). Kept for callers still resolving alerts by userId rather
 * than by meter directly.
 */
const ALERT_READINGS_TAKE = 2;

export const getUserDataForAlert = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const meter = await resolveMeter(ctx, args.userId);
    if (meter) {
      return await getMeterDataForAlertHandler(ctx, meter._id);
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, args.userId);

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(ALERT_READINGS_TAKE);

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(MAX_ALERT_PURCHASES);

    return { readings, purchases };
  },
});

async function getMeterDataForAlertHandler(ctx: QueryCtx, meterId: Doc<"meters">["_id"]) {
  const readings = await ctx.db
    .query("meter_readings")
    .withIndex("by_meterId_date", (q) => q.eq("meterId", meterId))
    .order("desc")
    .take(ALERT_READINGS_TAKE);

  const purchases = await ctx.db
    .query("purchases")
    .withIndex("by_meterId_date", (q) => q.eq("meterId", meterId))
    .order("desc")
    .take(MAX_ALERT_PURCHASES);

  return { readings, purchases };
}

/**
 * Internal query to fetch readings/purchases for a specific meter directly —
 * the meter is already known (resolved via `getMetersForAlerts`), so unlike
 * `getUserDataForAlert` there's no need to re-derive it from a userId.
 */
export const getMeterDataForAlert = internalQuery({
  args: { meterId: v.id("meters") },
  handler: async (ctx, args) => {
    return await getMeterDataForAlertHandler(ctx, args.meterId);
  },
});

/**
 * Internal mutation to remove an expired/invalid push subscription.
 */
export const removeExpiredSubscription = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        pushSubscription: undefined,
        pushNotificationsEnabled: false,
      });
    }
  },
});

/**
 * Internal mutation to record when a low-balance alert was sent for a meter.
 * Patched once per meter per cron tick (not once per recipient), so the
 * cooldown is shared across every household member watching that meter.
 */
export const updateMeterAlertTimestamp = internalMutation({
  args: { meterId: v.id("meters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meterId, { lastAlertSent: Date.now() });
  },
});
