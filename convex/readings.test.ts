/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("readings", () => {
  describe("getReadings", () => {
    it("returns empty array for unauthenticated user", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.readings.getReadings, {});
      expect(result).toEqual([]);
    });

    it("returns readings for authenticated user in descending date order", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-10",
          readingPre: 1000,
          readingPost: 1010,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1010,
          readingPost: 1030,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-05",
          readingPre: 990,
          readingPost: 1000,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getReadings, {});

      expect(result).toHaveLength(3);
      expect(result[0]?.date).toBe("2024-01-15");
      expect(result[1]?.date).toBe("2024-01-10");
      expect(result[2]?.date).toBe("2024-01-05");
    });
  });

  describe("addOnboardingReading", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.readings.addOnboardingReading, { reading: 5000 })
      ).rejects.toThrow("Not authenticated");
    });

    it("happy path: inserts a new onboarding reading when none exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.addOnboardingReading, { reading: 5000 });

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(readings).toHaveLength(1);
      expect(readings[0]?.source).toBe("onboarding");
      expect(readings[0]?.readingPre).toBe(5000);
      expect(readings[0]?.readingPost).toBe(5000);
    });

    it("idempotent: calling again with source 'onboarding' overwrites the reading", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.addOnboardingReading, { reading: 5000 });
      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.addOnboardingReading, { reading: 6000 });

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(readings).toHaveLength(1);
      expect(readings[0]?.readingPre).toBe(6000);
      expect(readings[0]?.readingPost).toBe(6000);
    });

    it("throws error if user already has a 'purchase' reading", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.readings.addOnboardingReading, { reading: 5000 })
      ).rejects.toThrow("User already has purchase readings. Cannot add onboarding reading.");
    });

    it("updates defaultDailyUsage on profile when provided", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.addOnboardingReading, { reading: 5000, defaultDailyUsage: 15 });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.defaultDailyUsage).toBe(15);
    });
  });

  describe("hasAnyReadings", () => {
    it("returns false for unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.readings.hasAnyReadings, {});
      expect(result).toBe(false);
    });

    it("returns false when no readings exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.hasAnyReadings, {});
      expect(result).toBe(false);
    });

    it("returns true when a reading exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.hasAnyReadings, {});
      expect(result).toBe(true);
    });
  });

  describe("hasPurchaseReadings", () => {
    it("returns false for unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.readings.hasPurchaseReadings, {});
      expect(result).toBe(false);
    });

    it("returns false when only onboarding readings exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1000,
          source: "onboarding",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.hasPurchaseReadings, {});
      expect(result).toBe(false);
    });

    it("returns true when a purchase reading exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.hasPurchaseReadings, {});
      expect(result).toBe(true);
    });
  });

  describe("getConsumptionStats", () => {
    it("returns null for unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.readings.getConsumptionStats, {});
      expect(result).toBeNull();
    });

    it("returns non-null stats when readings exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "test@test.com",
          lowBalanceThreshold: 10,
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-10",
          readingPre: 1000,
          readingPost: 1050,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1050,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getConsumptionStats, {});

      expect(result).not.toBeNull();
      expect(result?.dailyBurnRate).toBeDefined();
    });
  });

  describe("correctMeterReading", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.readings.correctMeterReading, { reading: 500 })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("inserts a new correction reading dated today", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.correctMeterReading, { reading: 500 });

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(readings).toHaveLength(1);
      expect(readings[0]?.source).toBe("correction");
      expect(readings[0]?.readingPre).toBe(500);
      expect(readings[0]?.readingPost).toBe(500);
      expect(readings[0]?.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("rejects a negative reading", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.readings.correctMeterReading, { reading: -1 })
      ).rejects.toThrow("Reading must be between");
    });

    it("wins the same-date tie-break over an earlier purchase reading", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";
      const todayStr = new Date().toISOString().split("T")[0] ?? "";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: todayStr,
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.correctMeterReading, { reading: 900 });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getConsumptionStats, {});

      // The correction was recorded after the purchase reading, so as the more
      // recent action it should anchor the balance even though both share a date.
      expect(result?.lastReading).toBe(900);
    });

    it("is superseded by a later same-date purchase reading", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";
      const todayStr = new Date().toISOString().split("T")[0] ?? "";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.correctMeterReading, { reading: 900 });

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: todayStr,
          readingPre: 900,
          readingPost: 950,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getConsumptionStats, {});

      expect(result?.lastReading).toBe(950);
    });

    it("becomes the anchor for getConsumptionStats without corrupting the burn rate", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "test@test.com",
          lowBalanceThreshold: 10,
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-10",
          readingPre: 1000,
          readingPost: 1050,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1050,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const withoutCorrection = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getConsumptionStats, {});

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.readings.correctMeterReading, { reading: 900 });

      const withCorrection = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.readings.getConsumptionStats, {});

      expect(withCorrection?.lastReading).toBe(900);
      // Burn rate is unaffected because correction readings are excluded from the interval calc.
      expect(withCorrection?.dailyBurnRate).toBe(withoutCorrection?.dailyBurnRate);
    });
  });

  describe("household-member scenarios with effectiveUserId", () => {
    it("getReadings returns admin's readings when member queries", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-1";
      const memberId = "member-user-1";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .query(api.readings.getReadings, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(adminId);
    });

    it("addOnboardingReading by member respects admin purchase readings", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-2";
      const memberId = "member-user-2";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household 2",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      await expect(
        t
          .withIdentity({ subject: memberId, tokenIdentifier: memberId })
          .mutation(api.readings.addOnboardingReading, { reading: 5000 })
      ).rejects.toThrow("User already has purchase readings");
    });

    it("hasAnyReadings reflects admin data when queried by member", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-3";
      const memberId = "member-user-3";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household 3",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1000,
          source: "onboarding",
        });
      });

      const result = await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .query(api.readings.hasAnyReadings, {});

      expect(result).toBe(true);
    });

    it("hasPurchaseReadings reflects admin data when queried by member", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-4";
      const memberId = "member-user-4";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household 4",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .query(api.readings.hasPurchaseReadings, {});

      expect(result).toBe(true);
    });

    it("getConsumptionStats uses effectiveUserId for profile", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-5";
      const memberId = "member-user-5";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household 5",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("profiles", {
          userId: adminId,
          email: "admin@test.com",
          lowBalanceThreshold: 15,
        });
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-10",
          readingPre: 1000,
          readingPost: 1050,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId: adminId,
          date: "2024-01-15",
          readingPre: 1050,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .query(api.readings.getConsumptionStats, {});

      expect(result).not.toBeNull();
    });

    it("addOnboardingReading updates profile with defaultDailyUsage for effectiveUserId", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user-6";
      const memberId = "member-user-6";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household 6",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
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
        await ctx.db.insert("profiles", {
          userId: adminId,
          email: "admin@test.com",
        });
      });

      await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .mutation(api.readings.addOnboardingReading, { reading: 5000, defaultDailyUsage: 20 });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
      });

      expect(profile?.defaultDailyUsage).toBe(20);
    });
  });

  describe("meter-scoped behavior", () => {
    async function seedHouseholdWithTwoMeters(t: ReturnType<typeof convexTest>) {
      const userId = "meter-reader-1";
      const { meterA, meterB } = await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        const meterA = await ctx.db.insert("meters", {
          householdId,
          name: "A",
          lowBalanceThreshold: 30,
          createdAt: Date.now(),
        });
        const meterB = await ctx.db.insert("meters", {
          householdId,
          name: "B",
          lowBalanceThreshold: 5,
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", {
          userId,
          email: null,
          activeMeterId: meterA,
          lowBalanceThreshold: 999, // profile value must be ignored on the meter path
        });
        await ctx.db.insert("meter_readings", {
          userId,
          meterId: meterA,
          date: "2024-01-10",
          readingPre: 1000,
          readingPost: 1050,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId,
          meterId: meterB,
          date: "2024-01-10",
          readingPre: 500,
          readingPost: 520,
          source: "purchase",
        });
        return { meterA, meterB };
      });
      return { userId, meterA, meterB };
    }

    it("scopes getReadings to an explicit meterId", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA, meterB } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      const readingsA = await asUser.query(api.readings.getReadings, { meterId: meterA });
      const readingsB = await asUser.query(api.readings.getReadings, { meterId: meterB });

      expect(readingsA).toHaveLength(1);
      expect(readingsA[0]?.readingPost).toBe(1050);
      expect(readingsB).toHaveLength(1);
      expect(readingsB[0]?.readingPost).toBe(520);
    });

    it("uses the meter's lowBalanceThreshold, not the profile's, on the meter path", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterB } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      const stats = await asUser.query(api.readings.getConsumptionStats, { meterId: meterB });
      expect(stats?.lowBalanceThreshold).toBe(5);
    });

    it("throws Unauthorized for a meterId the caller has no membership for", async () => {
      const t = convexTest(schema, modules);
      const { meterA } = await seedHouseholdWithTwoMeters(t);
      const strangerId = "reading-stranger-1";
      const asStranger = t.withIdentity({ subject: strangerId, tokenIdentifier: strangerId });

      await expect(asStranger.query(api.readings.getReadings, { meterId: meterA })).rejects.toThrow(
        "Unauthorized"
      );
      await expect(
        asStranger.query(api.readings.getConsumptionStats, { meterId: meterA })
      ).rejects.toThrow("Unauthorized");
    });

    it("getReadings merges unmigrated legacy readings (meterId undefined) with meter-scoped ones", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      // Legacy row for the same user, never migrated to carry a meterId.
      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-05",
          readingPre: 900,
          readingPost: 950,
          source: "purchase",
        });
      });

      const result = await asUser.query(api.readings.getReadings, { meterId: meterA });

      expect(result).toHaveLength(2);
      expect(result[0]?.date).toBe("2024-01-10");
      expect(result[0]?.meterId).toBe(meterA);
      expect(result[1]?.date).toBe("2024-01-05");
      expect(result[1]?.meterId).toBeUndefined();
    });

    it("hasAnyReadings returns true when only legacy (unmigrated) readings exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "meter-reader-legacy-1";

      const meterA = await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        const meterA = await ctx.db.insert("meters", {
          householdId,
          name: "A",
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", { userId, email: null, activeMeterId: meterA });
        // Legacy reading: no meterId, but belongs to this user.
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-05",
          readingPre: 900,
          readingPost: 950,
          source: "purchase",
        });
        return meterA;
      });

      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });
      const result = await asUser.query(api.readings.hasAnyReadings, { meterId: meterA });

      expect(result).toBe(true);
    });

    it("hasPurchaseReadings returns true when only legacy (unmigrated) purchase readings exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "meter-reader-legacy-2";

      const meterA = await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        const meterA = await ctx.db.insert("meters", {
          householdId,
          name: "A",
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", { userId, email: null, activeMeterId: meterA });
        // Legacy purchase reading: no meterId, but belongs to this user.
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-05",
          readingPre: 900,
          readingPost: 950,
          source: "purchase",
        });
        return meterA;
      });

      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });
      const result = await asUser.query(api.readings.hasPurchaseReadings, { meterId: meterA });

      expect(result).toBe(true);
    });

    it("getConsumptionStats computes stats from a mix of meter-scoped and legacy-unmigrated readings", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      // Legacy reading, dated after the meter-scoped seed reading, so it
      // becomes the most recent anchor for the balance calculation.
      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-20",
          readingPre: 1050,
          readingPost: 1100,
          source: "purchase",
        });
      });

      const stats = await asUser.query(api.readings.getConsumptionStats, { meterId: meterA });

      expect(stats).not.toBeNull();
      expect(stats?.lastReading).toBe(1100);
    });
  });
});
