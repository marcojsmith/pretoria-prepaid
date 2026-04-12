/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

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
          .withIdentity({ subject: userId })
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
        .withIdentity({ subject: adminId })
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
          .withIdentity({ subject: adminId })
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
          .withIdentity({ subject: adminId })
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
          .withIdentity({ subject: adminId })
          .mutation(api.rates.updateRate, { id: fakeId, rate: 4.0 })
      ).rejects.toThrow("Rate not found");
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
        t.withIdentity({ subject: userId }).mutation(api.rates.seedRates, {})
      ).rejects.toThrow("Not authorized");
    });

    it("inserts 4 tiers when no rates exist", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-user";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: adminId, role: "admin" });
      });

      await t.withIdentity({ subject: adminId }).mutation(api.rates.seedRates, {});

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

      await t.withIdentity({ subject: adminId }).mutation(api.rates.seedRates, {});

      const rates = await t.query(api.rates.getRates, {});

      expect(rates).toHaveLength(1);
      expect(rates[0]?.rate).toBe(99.99);
    });
  });
});
