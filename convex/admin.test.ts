/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("admin", () => {
  describe("getRecentPurchases", () => {
    it("returns correct readingPre and readingPost values", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", {
          userId: "user-1",
          email: "user1@test.com",
          preferredName: "User One",
        });
        await ctx.db.insert("profiles", {
          userId: "user-2",
          email: "user2@test.com",
          preferredName: "User Two",
        });
        await ctx.db.insert("purchases", {
          userId: "user-1",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("purchases", {
          userId: "user-2",
          date: "2024-01-14",
          units: 75,
          cost: 256.94,
          amountPaid: 260,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "user-1",
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId: "user-2",
          date: "2024-01-14",
          readingPre: 2000,
          readingPost: 2075,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getRecentPurchases, {});

      const user1 = result.find((r) => r.userId === "user-1" && r.date === "2024-01-15");
      expect(user1).toBeDefined();
      expect(user1?.readingPre).toBe(1000);
      expect(user1?.readingPost).toBe(1100);
      expect(user1?.userName).toBe("User One");

      const user2 = result.find((r) => r.userId === "user-2" && r.date === "2024-01-14");
      expect(user2).toBeDefined();
      expect(user2?.readingPre).toBe(2000);
      expect(user2?.readingPost).toBe(2075);
    });

    it("returns null readings when no meter readings exist", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", { userId: "user-1", email: "user1@test.com" });
        await ctx.db.insert("purchases", {
          userId: "user-1",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getRecentPurchases, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.readingPre).toBeNull();
      expect(result[0]?.readingPost).toBeNull();
    });

    it("returns null readings for purchase when readings exist but none match the purchase date", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", { userId: "user-1", email: "user1@test.com" });
        await ctx.db.insert("purchases", {
          userId: "user-1",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "user-1",
          date: "2024-01-10",
          readingPre: 500,
          readingPost: 600,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getRecentPurchases, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.readingPre).toBeNull();
      expect(result[0]?.readingPost).toBeNull();
    });

    it("uses oldest reading when duplicate meter readings exist for same user and date", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", { userId: "user-1", email: "user1@test.com" });
        await ctx.db.insert("purchases", {
          userId: "user-1",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "user-1",
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId: "user-1",
          date: "2024-01-15",
          readingPre: 3000,
          readingPost: 3100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getRecentPurchases, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.readingPre).toBe(1000);
      expect(result[0]?.readingPost).toBe(1100);
    });
  });

  describe("getUsersList", () => {
    it("paginates profiles and joins roles via index", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        for (let i = 1; i <= 3; i++) {
          await ctx.db.insert("profiles", {
            userId: `user-${String(i)}`,
            email: `user${String(i)}@test.com`,
          });
          await ctx.db.insert("user_roles", {
            userId: `user-${String(i)}`,
            role: i === 1 ? "admin" : "user",
          });
        }
      });

      const page1 = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUsersList, { paginationOpts: { numItems: 2, cursor: null } });

      expect(page1.page).toHaveLength(2);
      expect(page1.isDone).toBe(false);

      const page2 = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUsersList, {
          paginationOpts: { numItems: 2, cursor: page1.continueCursor },
        });

      expect(page2.page).toHaveLength(1);
      expect(page2.isDone).toBe(true);

      const allUsers = [...page1.page, ...page2.page];
      expect(allUsers).toHaveLength(3);

      const adminUser = allUsers.find((u) => u.userId === "user-1");
      expect(adminUser?.role).toBe("admin");

      const regularUser = allUsers.find((u) => u.userId === "user-2");
      expect(regularUser?.role).toBe("user");
    });

    it("assigns default user role when no user_roles entry exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", { userId: "no-role-user", email: "norole@test.com" });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUsersList, { paginationOpts: { numItems: 10, cursor: null } });

      const user = result.page.find((u) => u.userId === "no-role-user");
      expect(user?.role).toBe("user");
    });
  });

  describe("getUserKPIData", () => {
    it("returns correct reading data joined from purchases", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", {
          userId: "test-user",
          email: "testuser@test.com",
          lowBalanceThreshold: 10,
        });
        await ctx.db.insert("purchases", {
          userId: "test-user",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("purchases", {
          userId: "test-user",
          date: "2024-01-10",
          units: 50,
          cost: 171.29,
          amountPaid: 175,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "test-user",
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId: "test-user",
          date: "2024-01-10",
          readingPre: 950,
          readingPost: 1000,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUserKPIData, { userId: "test-user" });

      expect(result.recentPurchases).toHaveLength(2);
      expect(result.recentPurchases[0]?.date).toBe("2024-01-15");
      expect(result.recentPurchases[0]?.readingPre).toBe(1000);
      expect(result.recentPurchases[0]?.readingPost).toBe(1100);
      expect(result.recentPurchases[1]?.date).toBe("2024-01-10");
      expect(result.recentPurchases[1]?.readingPre).toBe(950);
      expect(result.recentPurchases[1]?.readingPost).toBe(1000);
    });

    it("returns null readingPre/readingPost for purchase with no matching meter reading date", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", {
          userId: "test-user",
          email: "testuser@test.com",
          lowBalanceThreshold: 10,
        });
        await ctx.db.insert("purchases", {
          userId: "test-user",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "test-user",
          date: "2024-01-10",
          readingPre: 500,
          readingPost: 600,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUserKPIData, { userId: "test-user" });

      expect(result.recentPurchases).toHaveLength(1);
      expect(result.recentPurchases[0]?.readingPre).toBeNull();
      expect(result.recentPurchases[0]?.readingPost).toBeNull();
    });

    it("uses oldest reading when duplicate meter readings exist for same user and date", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("user_roles", { userId: "admin-user-id", role: "admin" });
        await ctx.db.insert("profiles", {
          userId: "test-user",
          email: "testuser@test.com",
          lowBalanceThreshold: 10,
        });
        await ctx.db.insert("purchases", {
          userId: "test-user",
          date: "2024-01-15",
          units: 100,
          cost: 342.59,
          amountPaid: 350,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: "test-user",
          date: "2024-01-15",
          readingPre: 1000,
          readingPost: 1100,
          source: "purchase",
        });
        await ctx.db.insert("meter_readings", {
          userId: "test-user",
          date: "2024-01-15",
          readingPre: 3000,
          readingPost: 3100,
          source: "purchase",
        });
      });

      const result = await t
        .withIdentity({ subject: "admin-user-id", tokenIdentifier: "admin-user-id" })
        .query(api.admin.getUserKPIData, { userId: "test-user" });

      expect(result.recentPurchases).toHaveLength(1);
      expect(result.recentPurchases[0]?.readingPre).toBe(1000);
      expect(result.recentPurchases[0]?.readingPost).toBe(1100);
    });
  });
});
