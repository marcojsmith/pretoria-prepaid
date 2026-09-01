/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

/**
 * `ctx.scheduler.runAfter(0, ...)` jobs only flip from "pending" to "inProgress"
 * once real wall-clock time elapses, so `finishInProgressScheduledFunctions()`
 * alone is a no-op immediately after the triggering mutation returns.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("rates", () => {
  describe("getRates", () => {
    it("returns empty array when no rates exist", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.rates.getRates, {});
      expect(result).toEqual([]);
    });

    it("returns all rates in ascending order", async () => {
      const t = convexTest(schema, modules);

      // Insert in tier_number order so creation time matches expected sort order
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
      });

      const result = await t.query(api.rates.getRates, {});

      expect(result).toHaveLength(3);
      expect(result[0]?.tier_number).toBe(1);
      expect(result[1]?.tier_number).toBe(2);
      expect(result[2]?.tier_number).toBe(3);
    });
  });

  describe("updateRate", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        const id = await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.42585,
        });
        await expect(t.mutation(api.rates.updateRate, { id, rate: 4.0 })).rejects.toThrow(
          "Not authenticated"
        );
      });
    });

    it("throws 'Not authorized' if user is not admin", async () => {
      const t = convexTest(schema, modules);
      const userId = "regular-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId, role: "user" });
      });

      const rateId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.42585,
        });
      });

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.rates.updateRate, { id: rateId, rate: 4.0 })
      ).rejects.toThrow("Not authorized");
    });

    it("updates rate when called by admin", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      const rateId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.42585,
        });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.updateRate, { id: rateId, rate: 4.5 });

      const rate = await t.mutation(async (ctx) => {
        return await ctx.db.get(rateId);
      });

      expect(rate?.rate).toBe(4.5);
    });

    it("throws if rate < RATE_MIN (0.01)", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      const rateId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.42585,
        });
      });

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.rates.updateRate, { id: rateId, rate: 0.001 })
      ).rejects.toThrow("Rate must be between R0.01 and R100 per kWh");
    });

    it("throws if rate > RATE_MAX (100)", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      const rateId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 3.42585,
        });
      });

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.rates.updateRate, { id: rateId, rate: 150 })
      ).rejects.toThrow("Rate must be between R0.01 and R100 per kWh");
    });

    it("throws if rate id not found", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      const fakeId = "99999;electricity_rates" as unknown as Id<"electricity_rates">;

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.rates.updateRate, { id: fakeId, rate: 4.0 })
      ).rejects.toThrow("Rate not found");
    });

    it("reprices an already-recorded purchase when the rate changes", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      const userId = "some-user";

      const rateId = await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: null,
          rate: 4.0,
          effectiveFrom: "2025-07-01",
        });
      });

      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId,
          date: "2025-08-01",
          units: 100,
          cost: 400,
          amountPaid: 400,
          tierBreakdown: [],
        });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.updateRate, { id: rateId, rate: 5.0 });

      await delay(10);
      await t.finishInProgressScheduledFunctions();

      const purchase = await t.mutation(async (ctx) => ctx.db.get(purchaseId));
      expect(purchase?.cost).toBe(500);
    });

    it("does not reprice purchases before the rate row's effectiveFrom", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      const userId = "some-user";

      const rateId = await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: null,
          rate: 4.0,
          effectiveFrom: "2025-07-01",
        });
      });

      // Purchase predates the rate row's effectiveFrom, so it's priced off some
      // other (unset here) rate and must be left untouched by this correction.
      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId,
          date: "2025-06-01",
          units: 100,
          cost: 342.585,
          amountPaid: 342.585,
          tierBreakdown: [],
        });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.updateRate, { id: rateId, rate: 5.0 });

      await delay(10);
      await t.finishInProgressScheduledFunctions();

      const purchase = await t.mutation(async (ctx) => ctx.db.get(purchaseId));
      expect(purchase?.cost).toBe(342.585);
    });

    it("does not reprice when only the cosmetic tier_label changes", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      const userId = "some-user";

      const rateId = await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
        return await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: null,
          rate: 4.0,
          effectiveFrom: "2025-07-01",
        });
      });

      const purchaseId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("purchases", {
          userId,
          date: "2025-08-01",
          units: 100,
          cost: 400,
          amountPaid: 400,
          tierBreakdown: [],
        });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.updateRate, { id: rateId, tier_label: "Renamed Tier" });

      await delay(10);
      await t.finishInProgressScheduledFunctions();

      const purchase = await t.mutation(async (ctx) => ctx.db.get(purchaseId));
      expect(purchase?.cost).toBe(400);
    });
  });

  describe("seedRates", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.rates.seedRates, {})).rejects.toThrow("Not authenticated");
    });

    it("throws 'Not authorized' if user is not admin", async () => {
      const t = convexTest(schema, modules);
      const userId = "regular-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId, role: "user" });
      });

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.rates.seedRates, {})
      ).rejects.toThrow("Not authorized");
    });

    it("inserts 4 tiers when no rates exist", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.seedRates, {});

      const rates = await t.query(api.rates.getRates, {});

      expect(rates).toHaveLength(4);
      expect(rates.find((r) => r.tier_number === 1)?.rate).toBe(3.42585);
      expect(rates.find((r) => r.tier_number === 2)?.rate).toBe(4.00936);
      expect(rates.find((r) => r.tier_number === 3)?.rate).toBe(4.36816);
      expect(rates.find((r) => r.tier_number === 4)?.rate).toBe(4.70902);
    });

    it("does nothing (idempotent) if rates already exist", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
        await ctx.db.insert("electricity_rates", {
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 1,
          max_units: 100,
          rate: 99.99,
        });
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.seedRates, {});

      const rates = await t.query(api.rates.getRates, {});

      expect(rates).toHaveLength(1);
      expect(rates[0]?.rate).toBe(99.99);
    });
  });

  describe("addRatePeriod", () => {
    const newRates = [
      { tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.7274 },
      { tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.3622 },
      { tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.7525 },
      { tier_number: 4, tier_label: "Tier 4", min_units: 651, max_units: null, rate: 5.1234 },
    ];

    async function seedAdmin(t: ReturnType<typeof convexTest>, adminId: string) {
      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });
    }

    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.rates.addRatePeriod, { effectiveFrom: "2026-07-01", rates: newRates })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws 'Not authorized' if user is not admin", async () => {
      const t = convexTest(schema, modules);
      const userId = "regular-user";
      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId, role: "user" });
      });

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.rates.addRatePeriod, { effectiveFrom: "2026-07-01", rates: newRates })
      ).rejects.toThrow("Not authorized");
    });

    it("inserts one row per tier with the given effectiveFrom", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      await seedAdmin(t, adminId);

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.rates.addRatePeriod, { effectiveFrom: "2026-07-01", rates: newRates });

      const rows = await t.mutation(async (ctx) => {
        return await ctx.db.query("electricity_rates").collect();
      });

      expect(rows).toHaveLength(4);
      expect(rows.every((r) => r.effectiveFrom === "2026-07-01")).toBe(true);
      expect(rows.find((r) => r.tier_number === 1)?.rate).toBe(3.7274);
    });

    it("rejects a duplicate effectiveFrom", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      await seedAdmin(t, adminId);

      const asAdmin = t.withIdentity({ subject: adminId, tokenIdentifier: adminId });
      await asAdmin.mutation(api.rates.addRatePeriod, {
        effectiveFrom: "2026-07-01",
        rates: newRates,
      });

      await expect(
        asAdmin.mutation(api.rates.addRatePeriod, { effectiveFrom: "2026-07-01", rates: newRates })
      ).rejects.toThrow("already exists");
    });

    it("rejects an out-of-range rate", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";
      await seedAdmin(t, adminId);

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.rates.addRatePeriod, {
            effectiveFrom: "2026-07-01",
            rates: [
              { tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 150 },
            ],
          })
      ).rejects.toThrow("Rate must be between");
    });
  });
});
