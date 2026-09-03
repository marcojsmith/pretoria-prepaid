/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { MAX_ALERT_PURCHASES } from "./constants";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("alerts_queries", () => {
  describe("getUserDataForAlert", () => {
    it("returns at most MAX_ALERT_PURCHASES purchases", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-123";

      await t.mutation(async (ctx) => {
        for (let i = 0; i < 150; i++) {
          await ctx.db.insert("purchases", {
            userId,
            date: `2024-01-${String((i % 28) + 1).padStart(2, "0")}`,
            units: 10,
            cost: 100,
            amountPaid: 100,
            tierBreakdown: [],
          });
        }
      });

      const result = await t.query(internal.alerts_queries.getUserDataForAlert, { userId });

      expect(result.purchases.length).toBe(MAX_ALERT_PURCHASES);
    });
  });

  describe("getMetersForAlerts", () => {
    it("returns only non-archived meters", async () => {
      const t = convexTest(schema, modules);
      const householdId = await t.run(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: "admin-1",
          name: "Test House",
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("meters", {
          householdId,
          name: "Active Meter",
          createdAt: Date.now(),
        });
        await ctx.db.insert("meters", {
          householdId,
          name: "Archived Meter",
          archived: true,
          createdAt: Date.now(),
        });
      });

      const meters = await t.query(internal.alerts_queries.getMetersForAlerts, {});

      expect(meters).toHaveLength(1);
      expect(meters[0]?.name).toBe("Active Meter");
    });
  });

  describe("getMeterAlertRecipients", () => {
    it("returns only household members with push enabled and a subscription", async () => {
      const t = convexTest(schema, modules);
      const householdId = await t.run(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: "admin-1",
          name: "Test House",
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("household_members", {
          householdId,
          userId: "admin-1",
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: "member-no-push",
          role: "member",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("profiles", {
          userId: "admin-1",
          email: "admin@test.com",
          pushNotificationsEnabled: true,
          pushSubscription: {
            endpoint: "https://example.com/push",
            expirationTime: null,
            keys: { p256dh: "a", auth: "b" },
          },
        });
        await ctx.db.insert("profiles", {
          userId: "member-no-push",
          email: "member@test.com",
          pushNotificationsEnabled: false,
        });
      });

      const recipients = await t.query(internal.alerts_queries.getMeterAlertRecipients, {
        householdId,
      });

      expect(recipients).toHaveLength(1);
      expect(recipients[0]?.userId).toBe("admin-1");
    });
  });

  describe("getMeterDataForAlert", () => {
    it("returns readings and purchases scoped to the given meter", async () => {
      const t = convexTest(schema, modules);
      const householdId = await t.run(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: "admin-1",
          name: "Test House",
          createdAt: Date.now(),
        });
      });
      const meterId: Id<"meters"> = await t.run(async (ctx) => {
        return await ctx.db.insert("meters", {
          householdId,
          name: "Main Meter",
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("meter_readings", {
          userId: "admin-1",
          meterId,
          date: "2024-05-01",
          readingPre: 100,
          readingPost: 90,
          source: "purchase",
        });
        await ctx.db.insert("purchases", {
          userId: "admin-1",
          meterId,
          date: "2024-05-01",
          units: 10,
          cost: 50,
          amountPaid: 50,
          tierBreakdown: [],
        });
      });

      const result = await t.query(internal.alerts_queries.getMeterDataForAlert, { meterId });

      expect(result.readings).toHaveLength(1);
      expect(result.purchases).toHaveLength(1);
    });
  });

  describe("updateMeterAlertTimestamp", () => {
    it("patches lastAlertSent on the given meter", async () => {
      const t = convexTest(schema, modules);
      const householdId = await t.run(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: "admin-1",
          name: "Test House",
          createdAt: Date.now(),
        });
      });
      const meterId: Id<"meters"> = await t.run(async (ctx) => {
        return await ctx.db.insert("meters", {
          householdId,
          name: "Main Meter",
          createdAt: Date.now(),
        });
      });

      await t.mutation(internal.alerts_queries.updateMeterAlertTimestamp, { meterId });

      const meter = await t.run(async (ctx) => await ctx.db.get(meterId));
      expect(meter?.lastAlertSent).toBeTypeOf("number");
    });
  });
});
