/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("migrations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("backfills meters, activeMeterId, and meterId on purchases/readings for both solo and household users", async () => {
    const t = convexTest(schema, modules);

    const soloUserId = "solo-user-1";
    const adminId = "hh-admin-1";
    const memberId = "hh-member-1";

    await t.run(async (ctx) => {
      // Solo user with no household membership.
      await ctx.db.insert("profiles", { userId: soloUserId, email: "solo@test.com" });
      await ctx.db.insert("purchases", {
        userId: soloUserId,
        date: "2024-01-10",
        units: 10,
        cost: 100,
        amountPaid: 100,
        tierBreakdown: [],
      });
      await ctx.db.insert("meter_readings", {
        userId: soloUserId,
        date: "2024-01-10",
        readingPre: 1000,
        readingPost: 1010,
        source: "purchase",
      });

      // Household with an admin and a member; data keyed by the admin (legacy
      // resolveEffectiveUserId behaviour).
      const householdId = await ctx.db.insert("households", {
        adminUserId: adminId,
        name: "Test Household",
        createdAt: Date.now(),
      });
      await ctx.db.insert("household_members", {
        householdId,
        userId: adminId,
        role: "admin",
        joinedAt: Date.now(),
      });
      await ctx.db.insert("household_members", {
        householdId,
        userId: memberId,
        role: "member",
        joinedAt: Date.now(),
      });
      await ctx.db.insert("profiles", { userId: adminId, email: "admin@test.com" });
      await ctx.db.insert("profiles", { userId: memberId, email: "member@test.com" });

      await ctx.db.insert("purchases", {
        userId: adminId,
        date: "2024-02-05",
        units: 20,
        cost: 200,
        amountPaid: 200,
        tierBreakdown: [],
      });
      await ctx.db.insert("meter_readings", {
        userId: adminId,
        date: "2024-02-05",
        readingPre: 2000,
        readingPost: 2020,
        source: "purchase",
      });
    });

    await t.mutation(internal.migrations.runAll, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    // All three profiles now have an activeMeterId.
    const profiles = await t.run(async (ctx) => ctx.db.query("profiles").collect());
    expect(profiles).toHaveLength(3);
    for (const profile of profiles) {
      expect(profile.activeMeterId).toBeDefined();
    }

    const soloProfile = profiles.find((p) => p.userId === soloUserId);
    const adminProfile = profiles.find((p) => p.userId === adminId);
    const memberProfile = profiles.find((p) => p.userId === memberId);

    // The household member shares the admin's meter (mirrors household data sharing).
    expect(memberProfile?.activeMeterId).toBe(adminProfile?.activeMeterId);
    expect(soloProfile?.activeMeterId).not.toBe(adminProfile?.activeMeterId);

    // Every purchase and reading now carries the correct meterId.
    const purchases = await t.run(async (ctx) => ctx.db.query("purchases").collect());
    expect(purchases).toHaveLength(2);
    for (const purchase of purchases) {
      expect(purchase.meterId).toBeDefined();
      if (purchase.userId === soloUserId) {
        expect(purchase.meterId).toBe(soloProfile?.activeMeterId);
      } else {
        expect(purchase.meterId).toBe(adminProfile?.activeMeterId);
      }
    }

    const readings = await t.run(async (ctx) => ctx.db.query("meter_readings").collect());
    expect(readings).toHaveLength(2);
    for (const reading of readings) {
      expect(reading.meterId).toBeDefined();
      if (reading.userId === soloUserId) {
        expect(reading.meterId).toBe(soloProfile?.activeMeterId);
      } else {
        expect(reading.meterId).toBe(adminProfile?.activeMeterId);
      }
    }

    const metersAfterFirstRun = await t.run(async (ctx) => ctx.db.query("meters").collect());

    // Running again changes nothing (idempotent).
    await t.mutation(internal.migrations.runAll, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const metersAfterSecondRun = await t.run(async (ctx) => ctx.db.query("meters").collect());
    expect(metersAfterSecondRun).toHaveLength(metersAfterFirstRun.length);

    const purchasesAfterSecondRun = await t.run(async (ctx) => ctx.db.query("purchases").collect());
    expect(purchasesAfterSecondRun).toEqual(purchases);

    const count = await t.query(internal.migrations.countUnmigrated, {});
    expect(count.purchases).toBe(0);
    expect(count.readings).toBe(0);
    expect(count.partial).toBe(false);
  });
});
