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
const SCAN_BATCH = 500;

const cursorArg = v.optional(v.union(v.string(), v.null()));
const chainNextArg = v.optional(v.boolean());

async function resolveMeterIdForUserId(
  ctx: MutationCtx,
  userId: string
): Promise<Id<"meters"> | null> {
  const household = await ctx.db
    .query("households")
    .withIndex("by_adminUserId", (q) => q.eq("adminUserId", userId))
    .unique();
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

async function countUnmigratedInPurchases(
  ctx: QueryCtx
): Promise<{ count: number; partial: boolean }> {
  let cursor: string | null = null;
  let scanned = 0;
  let count = 0;
  let isDone = false;

  while (scanned < SCAN_LIMIT) {
    const page = await ctx.db.query("purchases").paginate({ cursor, numItems: SCAN_BATCH });
    for (const p of page.page) {
      if (!p.meterId) count++;
    }
    scanned += page.page.length;
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
    const page = await ctx.db.query("meter_readings").paginate({ cursor, numItems: SCAN_BATCH });
    for (const r of page.page) {
      if (!r.meterId) count++;
    }
    scanned += page.page.length;
    isDone = page.isDone;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  return { count, partial: !isDone && scanned >= SCAN_LIMIT };
}

const countResultValidator = v.object({ count: v.number(), partial: v.boolean() });

// Convex only allows a single `.paginate()` call per function invocation, so
// each table's scan is its own internal query, and `countUnmigrated` composes
// them via `ctx.runQuery` rather than calling the helpers directly in-process.
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
