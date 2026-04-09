/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { checkRateLimit } from "./rateLimiter";
import { ConvexError } from "convex/values";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("rateLimiter", () => {
  describe("checkRateLimit", () => {
    it("allows actions within the limit", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(async (ctx) => {
          await checkRateLimit({
            ctx,
            userId: "user-123",
            action: "testAction",
            limit: 10,
            windowMs: 60_000,
          });
        });
      }

      await t.mutation(async (ctx) => {
        const rateLimitRow = await ctx.db
          .query("rate_limits")
          .withIndex("by_userId_action", (q) =>
            q.eq("userId", "user-123").eq("action", "testAction")
          )
          .unique();

        expect(rateLimitRow).not.toBeNull();
        expect(rateLimitRow!.count).toBe(5);
        expect(rateLimitRow!.userId).toBe("user-123");
        expect(rateLimitRow!.action).toBe("testAction");
        expect(rateLimitRow!.windowStart).toBeGreaterThan(Date.now() - 60_000);
      });
    });

    it("throws ConvexError when limit is exceeded", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("rate_limits", {
          userId: "user-123",
          action: "testAction",
          windowStart: Date.now(),
          count: 10,
        });
      });

      let errorThrown = false;
      try {
        await t.mutation(async (ctx) => {
          await checkRateLimit({
            ctx,
            userId: "user-123",
            action: "testAction",
            limit: 10,
            windowMs: 60_000,
          });
        });
      } catch (error) {
        errorThrown = error instanceof ConvexError;
      }

      expect(errorThrown).toBe(true);
    });

    it("resets window after windowMs expires", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("rate_limits", {
          userId: "user-123",
          action: "testAction",
          windowStart: Date.now() - 61_000,
          count: 10,
        });
      });

      await t.mutation(async (ctx) => {
        await checkRateLimit({
          ctx,
          userId: "user-123",
          action: "testAction",
          limit: 10,
          windowMs: 60_000,
        });

        const rateLimitRow = await ctx.db
          .query("rate_limits")
          .withIndex("by_userId_action", (q) =>
            q.eq("userId", "user-123").eq("action", "testAction")
          )
          .unique();

        expect(rateLimitRow).not.toBeNull();
        expect(rateLimitRow!.count).toBe(1);
        expect(rateLimitRow!.windowStart).toBeGreaterThan(Date.now() - 60_000);
      });
    });

    it("creates new row when no existing row exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await checkRateLimit({
          ctx,
          userId: "new-user",
          action: "newAction",
          limit: 10,
          windowMs: 60_000,
        });

        const rateLimitRow = await ctx.db
          .query("rate_limits")
          .withIndex("by_userId_action", (q) =>
            q.eq("userId", "new-user").eq("action", "newAction")
          )
          .unique();

        expect(rateLimitRow).not.toBeNull();
        expect(rateLimitRow!.userId).toBe("new-user");
        expect(rateLimitRow!.action).toBe("newAction");
        expect(rateLimitRow!.count).toBe(1);
        expect(rateLimitRow!.windowStart).toBeGreaterThan(Date.now() - 60_000);
      });
    });

    it("increments count when within window and under limit", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(async (ctx) => {
        await ctx.db.insert("rate_limits", {
          userId: "user-123",
          action: "testAction",
          windowStart: Date.now(),
          count: 5,
        });
      });

      await t.mutation(async (ctx) => {
        await checkRateLimit({
          ctx,
          userId: "user-123",
          action: "testAction",
          limit: 10,
          windowMs: 60_000,
        });

        const rateLimitRow = await ctx.db
          .query("rate_limits")
          .withIndex("by_userId_action", (q) =>
            q.eq("userId", "user-123").eq("action", "testAction")
          )
          .unique();

        expect(rateLimitRow).not.toBeNull();
        expect(rateLimitRow!.count).toBe(6);
      });
    });
  });
});
