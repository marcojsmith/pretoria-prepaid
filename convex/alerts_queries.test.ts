/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { MAX_ALERT_PURCHASES } from "./constants";

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
});
