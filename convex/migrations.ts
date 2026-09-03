/**
 * Multi-meter phase 1 backfill.
 *
 * Deploy order:
 * 1. Deploy this change (schema + backend code).
 * 2. From the Convex dashboard, run `internal.migrations.runAll` once. It
 *    chains `backfillMetersForProfiles` -> `backfillPurchaseMeterIds` ->
 *    `backfillReadingMeterIds` in order, self-scheduling in batches of 100
 *    rows so no single invocation processes the whole table.
 * 3. Verify with `internal.migrations.countUnmigrated` — it should report
 *    `{ purchases: 0, readings: 0, partial: false }` once fully migrated
 *    (a small nonzero count is possible for legacy rows whose household has
 *    no resolvable meter; see `ensurePersonalHouseholdAndMeter`'s
 *    "non-admin member, no meter" case).
 */
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ensurePersonalHouseholdAndMeter } from "./lib/meters";
import type { Id } from "./_generated/dataModel";

const BATCH_SIZE = 100;
const TAKE_HOUSEHOLD_METERS = 10;
const SCAN_LIMIT = 5000;
// Exported (value unchanged) so tests can seed exactly `SCAN_BATCH + n` rows
// to deterministically exercise the multi-page `.paginate()` composition in
// `countUnmigratedInPurchases`/`countUnmigratedInReadings` without needing to
// guess the batch size.
export const SCAN_BATCH = 500;

const cursorArg = v.optional(v.union(v.string(), v.null()));
const chainNextArg = v.optional(v.boolean());

async function resolveMeterIdForUserId(
  ctx: MutationCtx,
  userId: string
): Promise<Id<"meters"> | null> {
  // `.unique()` throws if a userId is ever adminUserId of more than one
  // household, which would abort the whole batch mid-migration. That
  // shouldn't happen in normal app flow, but as a defensive guard we instead
  // take up to 2 and deterministically pick the oldest (first-created) one —
  // the household the user has had the longest relationship with and is most
  // likely still actively using — rather than letting one bad row halt the
  // migration.
  const households = await ctx.db
    .query("households")
    .withIndex("by_adminUserId", (q) => q.eq("adminUserId", userId))
    .take(2);
  const household = households[0];
  if (households.length > 1) {
    console.error(
      "resolveMeterIdForUserId: userId is adminUserId of multiple households, using the oldest",
      { userId, count: households.length }
    );
  }
  if (!household) return null;

  const meters = await ctx.db
    .query("meters")
    .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
    .take(TAKE_HOUSEHOLD_METERS);

  return meters.find((m) => !m.archived)?._id ?? null;
}

export const backfillMetersForProfiles = internalMutation({
  args: { cursor: cursorArg, chainNext: chainNextArg },
  returns: v.object({
    processed: v.number(),
    backfilled: v.number(),
    skippedNoMeter: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const chainNext = args.chainNext ?? false;
    const page = await ctx.db
      .query("profiles")
      .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });

    let backfilled = 0;
    let skippedNoMeter = 0;

    for (const profile of page.page) {
      if (profile.activeMeterId) continue;
      const meterId = await ensurePersonalHouseholdAndMeter(ctx, profile.userId, profile);
      if (meterId) {
        backfilled++;
      } else {
        skippedNoMeter++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillMetersForProfiles, {
        cursor: page.continueCursor,
        chainNext,
      });
    } else if (chainNext) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillPurchaseMeterIds, {
        cursor: null,
        chainNext: true,
      });
    }

    return {
      processed: page.page.length,
      backfilled,
      skippedNoMeter,
      isDone: page.isDone,
    };
  },
});

interface MeterBackfillRow {
  _id: Id<"purchases"> | Id<"meter_readings">;
  userId: string;
  meterId?: Id<"meters">;
}

/**
 * Shared backfill loop for both `purchases` and `meter_readings` — the two
 * tables have identical `userId`/`meterId` shapes for this purpose, but each
 * needs its own typed `patch` callback since `ctx.db.patch` is keyed to a
 * single table's document type and can't be called generically across two
 * tables without losing type safety.
 */
async function backfillMeterIdOnRows(options: {
  ctx: MutationCtx;
  rows: MeterBackfillRow[];
  cache: Map<string, Id<"meters"> | null>;
  patch: (id: MeterBackfillRow["_id"], meterId: Id<"meters">) => Promise<void>;
}): Promise<{ backfilled: number; unresolved: number }> {
  const { ctx, rows, cache, patch } = options;
  let backfilled = 0;
  let unresolved = 0;

  for (const row of rows) {
    if (row.meterId) continue;

    let meterId = cache.get(row.userId);
    if (meterId === undefined) {
      meterId = await resolveMeterIdForUserId(ctx, row.userId);
      cache.set(row.userId, meterId);
    }

    if (meterId) {
      await patch(row._id, meterId);
      backfilled++;
    } else {
      unresolved++;
    }
  }

  return { backfilled, unresolved };
}

export const backfillPurchaseMeterIds = internalMutation({
  args: { cursor: cursorArg, chainNext: chainNextArg },
  returns: v.object({
    processed: v.number(),
    backfilled: v.number(),
    unresolved: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const chainNext = args.chainNext ?? false;
    const page = await ctx.db
      .query("purchases")
      .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });

    const cache = new Map<string, Id<"meters"> | null>();
    const { backfilled, unresolved } = await backfillMeterIdOnRows({
      ctx,
      rows: page.page,
      cache,
      patch: (id, meterId) => ctx.db.patch(id as Id<"purchases">, { meterId }),
    });

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillPurchaseMeterIds, {
        cursor: page.continueCursor,
        chainNext,
      });
    } else if (chainNext) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillReadingMeterIds, {
        cursor: null,
        chainNext: true,
      });
    }

    return { processed: page.page.length, backfilled, unresolved, isDone: page.isDone };
  },
});

export const backfillReadingMeterIds = internalMutation({
  args: { cursor: cursorArg, chainNext: chainNextArg },
  returns: v.object({
    processed: v.number(),
    backfilled: v.number(),
    unresolved: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const chainNext = args.chainNext ?? false;
    const page = await ctx.db
      .query("meter_readings")
      .paginate({ cursor: args.cursor ?? null, numItems: BATCH_SIZE });

    const cache = new Map<string, Id<"meters"> | null>();
    const { backfilled, unresolved } = await backfillMeterIdOnRows({
      ctx,
      rows: page.page,
      cache,
      patch: (id, meterId) => ctx.db.patch(id as Id<"meter_readings">, { meterId }),
    });

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillReadingMeterIds, {
        cursor: page.continueCursor,
        chainNext,
      });
    }

    return { processed: page.page.length, backfilled, unresolved, isDone: page.isDone };
  },
});

/**
 * Kicks off the full migration chain: profiles -> purchases -> readings.
 * Each stage self-schedules in batches of `BATCH_SIZE` until done, then
 * schedules the next stage.
 */
export const runAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.migrations.backfillMetersForProfiles, {
      cursor: null,
      chainNext: true,
    });
    return null;
  },
});

const pageResultValidator = v.object({
  count: v.number(),
  scanned: v.number(),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

// Convex only allows a single `.paginate()` call per function invocation, so
// each page scan is its own internal query. `countUnmigratedInPurchases` /
// `countUnmigratedInReadings` compose repeated calls to these via
// `ctx.runQuery` rather than looping `.paginate()` in-process, since each
// `ctx.runQuery` call is a separate function invocation and therefore its
// own single `.paginate()` call.
export const countUnmigratedPurchasesPage = internalQuery({
  args: { cursor: cursorArg },
  returns: pageResultValidator,
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("purchases")
      .paginate({ cursor: args.cursor ?? null, numItems: SCAN_BATCH });
    let count = 0;
    for (const p of page.page) {
      if (!p.meterId) count++;
    }
    return {
      count,
      scanned: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const countUnmigratedReadingsPage = internalQuery({
  args: { cursor: cursorArg },
  returns: pageResultValidator,
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("meter_readings")
      .paginate({ cursor: args.cursor ?? null, numItems: SCAN_BATCH });
    let count = 0;
    for (const r of page.page) {
      if (!r.meterId) count++;
    }
    return {
      count,
      scanned: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

async function countUnmigratedInPurchases(
  ctx: QueryCtx
): Promise<{ count: number; partial: boolean }> {
  let cursor: string | null = null;
  let scanned = 0;
  let count = 0;
  let isDone = false;

  while (scanned < SCAN_LIMIT) {
    const page: { count: number; scanned: number; isDone: boolean; continueCursor: string } =
      await ctx.runQuery(internal.migrations.countUnmigratedPurchasesPage, { cursor });
    count += page.count;
    scanned += page.scanned;
    isDone = page.isDone;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  return { count, partial: !isDone && scanned >= SCAN_LIMIT };
}

async function countUnmigratedInReadings(
  ctx: QueryCtx
): Promise<{ count: number; partial: boolean }> {
  let cursor: string | null = null;
  let scanned = 0;
  let count = 0;
  let isDone = false;

  while (scanned < SCAN_LIMIT) {
    const page: { count: number; scanned: number; isDone: boolean; continueCursor: string } =
      await ctx.runQuery(internal.migrations.countUnmigratedReadingsPage, { cursor });
    count += page.count;
    scanned += page.scanned;
    isDone = page.isDone;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  return { count, partial: !isDone && scanned >= SCAN_LIMIT };
}

const countResultValidator = v.object({ count: v.number(), partial: v.boolean() });

export const countUnmigratedPurchases = internalQuery({
  args: {},
  returns: countResultValidator,
  handler: async (ctx) => await countUnmigratedInPurchases(ctx),
});

export const countUnmigratedReadings = internalQuery({
  args: {},
  returns: countResultValidator,
  handler: async (ctx) => await countUnmigratedInReadings(ctx),
});

export const countUnmigrated = internalQuery({
  args: {},
  returns: v.object({
    purchases: v.number(),
    readings: v.number(),
    partial: v.boolean(),
  }),
  handler: async (ctx) => {
    const purchasesResult: { count: number; partial: boolean } = await ctx.runQuery(
      internal.migrations.countUnmigratedPurchases,
      {}
    );
    const readingsResult: { count: number; partial: boolean } = await ctx.runQuery(
      internal.migrations.countUnmigratedReadings,
      {}
    );
    return {
      purchases: purchasesResult.count,
      readings: readingsResult.count,
      partial: purchasesResult.partial || readingsResult.partial,
    };
  },
});
