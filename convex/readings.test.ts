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

      const result = await t.withIdentity({ subject: userId }).query(api.readings.getReadings, {});

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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
        .mutation(api.readings.addOnboardingReading, { reading: 5000 });
      await t
        .withIdentity({ subject: userId })
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
          .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
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
        .withIdentity({ subject: userId })
        .query(api.readings.getConsumptionStats, {});

      expect(result).not.toBeNull();
      expect(result?.dailyBurnRate).toBeDefined();
    });
  });
});
