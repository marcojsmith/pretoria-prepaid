/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

async function seedRates(t: ReturnType<typeof convexTest>) {
  await t.mutation(async (ctx) => {
    await ctx.db.insert("electricity_rates", {
      tier_number: 1,
      tier_label: "Tier 1",
      min_units: 1,
      max_units: 100,
      rate: 3.42585,
    });
    await ctx.db.insert("electricity_rates", {
      tier_number: 2,
      tier_label: "Tier 2",
      min_units: 101,
      max_units: 400,
      rate: 4.00936,
    });
    await ctx.db.insert("electricity_rates", {
      tier_number: 3,
      tier_label: "Tier 3",
      min_units: 401,
      max_units: 650,
      rate: 4.36816,
    });
    await ctx.db.insert("electricity_rates", {
      tier_number: 4,
      tier_label: "Tier 4",
      min_units: 651,
      max_units: null,
      rate: 4.70902,
    });
  });
}

describe("purchases", () => {
  describe("getPurchases", () => {
    it("returns empty array for unauthenticated user", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.purchases.getPurchases, {});
      expect(result).toEqual([]);
    });

    it("returns purchases for authenticated user in descending date order", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-10",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
        await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-15",
          units: 20,
          cost: 200,
          amountPaid: 200,
          tierBreakdown: [],
        });
        await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-05",
          units: 5,
          cost: 50,
          amountPaid: 50,
          tierBreakdown: [],
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.purchases.getPurchases, {});

      expect(result).toHaveLength(3);
      expect(result[0]?.date).toBe("2024-01-15");
      expect(result[1]?.date).toBe("2024-01-10");
      expect(result[2]?.date).toBe("2024-01-05");
    });

    it("returns only the calling user's purchases", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";
      const otherUserId = "test-user-2";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-10",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
        await ctx.db.insert("purchases", {
          userId: otherUserId,
          date: "2024-01-15",
          units: 20,
          cost: 200,
          amountPaid: 200,
          tierBreakdown: [],
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.purchases.getPurchases, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(userId);
    });
  });

  describe("addPurchase", () => {
    it("happy path: adds purchase and meter_reading, returns an id", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await seedRates(t);

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.purchases.addPurchase, {
          date: "2024-01-15",
          units: 50,
          cost: 171.29,
          amountPaid: 175,
          meterReading: 1000,
        });

      expect(result).toBeDefined();

      const purchases = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.purchases.getPurchases, {});
      expect(purchases).toHaveLength(1);
      expect(purchases[0]?.units).toBe(50);
      expect(purchases[0]?.amountPaid).toBe(175);

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", "2024-01-15"))
          .collect();
      });
      expect(readings).toHaveLength(1);
      expect(readings[0]?.readingPre).toBe(1000);
      expect(readings[0]?.readingPost).toBe(1050);
      expect(readings[0]?.source).toBe("purchase");
    });

    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.purchases.addPurchase, {
          date: "2024-01-15",
          units: 50,
          cost: 171.29,
          amountPaid: 175,
          meterReading: 1000,
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws 'Values cannot be negative' for negative units", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t
          .withIdentity({ subject: "user-1", tokenIdentifier: "user-1" })
          .mutation(api.purchases.addPurchase, {
            date: "2024-01-15",
            units: -10,
            cost: 100,
            amountPaid: 100,
            meterReading: 1000,
          })
      ).rejects.toThrow("Values cannot be negative");
    });

    it("throws 'Values cannot be negative' for negative cost", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t
          .withIdentity({ subject: "user-1", tokenIdentifier: "user-1" })
          .mutation(api.purchases.addPurchase, {
            date: "2024-01-15",
            units: 10,
            cost: -100,
            amountPaid: 100,
            meterReading: 1000,
          })
      ).rejects.toThrow("Values cannot be negative");
    });

    it("throws 'Values cannot be negative' for negative amountPaid", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t
          .withIdentity({ subject: "user-1", tokenIdentifier: "user-1" })
          .mutation(api.purchases.addPurchase, {
            date: "2024-01-15",
            units: 10,
            cost: 100,
            amountPaid: -50,
            meterReading: 1000,
          })
      ).rejects.toThrow("Values cannot be negative");
    });

    it("stores the correct meterReading pre/post (post = pre + units)", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await seedRates(t);

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.purchases.addPurchase, {
          date: "2024-01-20",
          units: 75,
          cost: 256.94,
          amountPaid: 260,
          meterReading: 5000,
        });

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", "2024-01-20"))
          .collect();
      });

      expect(readings).toHaveLength(1);
      expect(readings[0]?.readingPre).toBe(5000);
      expect(readings[0]?.readingPost).toBe(5075);
    });

    it("schedules recalculation (check that the returned id is defined)", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await seedRates(t);

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.purchases.addPurchase, {
          date: "2024-02-01",
          units: 20,
          cost: 68.52,
          amountPaid: 70,
          meterReading: 2000,
        });

      expect(result).toBeDefined();
    });

    it("prices each purchase off the rate period in force on its own date", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      // Legacy rates (no effectiveFrom) + a dated 2026/27 period
      await seedRates(t);
      await t.mutation(async (ctx) => {
        await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.7274,
          effectiveFrom: "2026-07-01",
        });
      });

      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      await asUser.mutation(api.purchases.addPurchase, {
        date: "2026-06-15",
        units: 50,
        cost: 0,
        amountPaid: 175,
        meterReading: 1000,
      });
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2026-07-15",
        units: 50,
        cost: 0,
        amountPaid: 190,
        meterReading: 1050,
      });

      const purchases = await asUser.query(api.purchases.getPurchases, {});
      const before = purchases.find((p) => p.date === "2026-06-15");
      const after = purchases.find((p) => p.date === "2026-07-15");

      expect(before?.tierBreakdown[0]?.rate).toBe(3.42585);
      expect(before?.cost).toBeCloseTo(50 * 3.42585, 2);
      expect(after?.tierBreakdown[0]?.rate).toBe(3.7274);
      expect(after?.cost).toBeCloseTo(50 * 3.7274, 2);
    });
  });

  describe("deletePurchase", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        const id = await ctx.db.insert("purchases", {
          userId: "user-1",
          date: "2024-01-15",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
        await expect(t.mutation(api.purchases.deletePurchase, { id })).rejects.toThrow(
          "Not authenticated"
        );
      });
    });

    it("throws 'Unauthorized' if user tries to delete another user's purchase", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";
      const otherUserId = "test-user-2";

      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId: otherUserId,
          date: "2024-01-15",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
      });

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.purchases.deletePurchase, { id: purchaseId })
      ).rejects.toThrow("Unauthorized");
    });

    it("deletes the purchase document", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-15",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.purchases.deletePurchase, { id: purchaseId });

      const purchases = await t.mutation(async (ctx) => {
        return await ctx.db.get(purchaseId);
      });

      expect(purchases).toBeNull();
    });

    it("also deletes the associated meter_reading with source 'purchase'", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId,
          date: "2024-01-15",
          units: 10,
          cost: 100,
          amountPaid: 100,
          tierBreakdown: [],
        });
      });

      await t.mutation(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId,
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1010,
          source: "purchase",
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.purchases.deletePurchase, { id: purchaseId });

      const readings = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", "2024-01-15"))
          .collect();
      });

      expect(readings).toHaveLength(0);
    });
  });

  describe("meter-scoped behavior", () => {
    async function seedHouseholdWithTwoMeters(t: ReturnType<typeof convexTest>) {
      const userId = "meter-user-1";
      const { householdId, meterA, meterB } = await t.mutation(async (ctx) => {
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
        const meterB = await ctx.db.insert("meters", {
          householdId,
          name: "B",
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", { userId, email: null, activeMeterId: meterA });
        return { householdId, meterA, meterB };
      });
      return { userId, householdId, meterA, meterB };
    }

    it("scopes getPurchases to an explicit meterId (multi-meter scoping)", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA, meterB } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      await seedRates(t);
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2024-03-01",
        units: 10,
        cost: 0,
        amountPaid: 40,
        meterReading: 100,
        meterId: meterA,
      });
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2024-03-02",
        units: 20,
        cost: 0,
        amountPaid: 80,
        meterReading: 200,
        meterId: meterB,
      });

      const purchasesA = await asUser.query(api.purchases.getPurchases, { meterId: meterA });
      const purchasesB = await asUser.query(api.purchases.getPurchases, { meterId: meterB });

      expect(purchasesA).toHaveLength(1);
      expect(purchasesA[0]?.units).toBe(10);
      expect(purchasesB).toHaveLength(1);
      expect(purchasesB[0]?.units).toBe(20);
    });

    it("falls back to the active meter, then follows setActiveMeter (active-meter fallback)", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA, meterB } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      await seedRates(t);
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2024-03-01",
        units: 10,
        cost: 0,
        amountPaid: 40,
        meterReading: 100,
        meterId: meterA,
      });
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2024-03-02",
        units: 20,
        cost: 0,
        amountPaid: 80,
        meterReading: 200,
        meterId: meterB,
      });

      const initial = await asUser.query(api.purchases.getPurchases, {});
      expect(initial).toHaveLength(1);
      expect(initial[0]?.units).toBe(10); // meterA is active

      await asUser.mutation(api.meters.setActiveMeter, { meterId: meterB });

      const afterSwitch = await asUser.query(api.purchases.getPurchases, {});
      expect(afterSwitch).toHaveLength(1);
      expect(afterSwitch[0]?.units).toBe(20); // meterB now active
    });

    it("throws Unauthorized for a meterId the caller has no membership for", async () => {
      const t = convexTest(schema, modules);
      const { meterA } = await seedHouseholdWithTwoMeters(t);
      const strangerId = "stranger-1";
      const asStranger = t.withIdentity({ subject: strangerId, tokenIdentifier: strangerId });

      await expect(
        asStranger.query(api.purchases.getPurchases, { meterId: meterA })
      ).rejects.toThrow("Unauthorized");

      await expect(
        asStranger.mutation(api.purchases.addPurchase, {
          date: "2024-03-01",
          units: 10,
          cost: 40,
          amountPaid: 40,
          meterReading: 100,
          meterId: meterA,
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("dual-keys the meter-path insert with both meterId and userId so legacy readers still see it", async () => {
      const t = convexTest(schema, modules);
      const { userId, meterA } = await seedHouseholdWithTwoMeters(t);
      const asUser = t.withIdentity({ subject: userId, tokenIdentifier: userId });

      await seedRates(t);
      await asUser.mutation(api.purchases.addPurchase, {
        date: "2024-03-01",
        units: 10,
        cost: 0,
        amountPaid: 40,
        meterReading: 100,
        meterId: meterA,
      });

      const inserted = await t.run(async (ctx) => ctx.db.query("purchases").collect());
      expect(inserted).toHaveLength(1);
      expect(inserted[0]?.meterId).toBe(meterA);
      expect(inserted[0]?.userId).toBe(userId);

      // A legacy (userId-only) query still finds the row.
      const legacyResult = await t.run(async (ctx) =>
        ctx.db
          .query("purchases")
          .withIndex("by_userId_date", (q) => q.eq("userId", userId))
          .collect()
      );
      expect(legacyResult).toHaveLength(1);
    });
  });
});
