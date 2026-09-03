/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { resolveMeter } from "./lib/meters";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

async function seedHouseholdWithAdminAndMember(t: ReturnType<typeof convexTest>) {
  const adminId = "admin-1";
  const memberId = "member-1";
  const householdId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("households", {
      adminUserId: adminId,
      name: "Home",
      createdAt: Date.now(),
    });
    await ctx.db.insert("household_members", {
      householdId: id,
      userId: adminId,
      role: "admin",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("household_members", {
      householdId: id,
      userId: memberId,
      role: "member",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: adminId, email: null });
    await ctx.db.insert("profiles", { userId: memberId, email: null });
    return id;
  });
  return { adminId, memberId, householdId };
}

describe("meters", () => {
  describe("listMyMeters", () => {
    it("returns [] for unauthenticated user", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.meters.listMyMeters, {});
      expect(result).toEqual([]);
    });

    it("lists non-archived meters across the caller's household with isActive flag", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);

      const { meterA, meterB } = await t.run(async (ctx) => {
        const meterA = await ctx.db.insert("meters", {
          householdId,
          name: "A",
          createdAt: Date.now(),
        });
        const meterB = await ctx.db.insert("meters", {
          householdId,
          name: "B",
          archived: true,
          createdAt: Date.now(),
        });
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
        if (profile) await ctx.db.patch(profile._id, { activeMeterId: meterA });
        return { meterA, meterB };
      });
      void meterB;

      const result = await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .query(api.meters.listMyMeters, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.meterId).toBe(meterA);
      expect(result[0]?.isActive).toBe(true);
      expect(result[0]?.myRole).toBe("admin");
    });
  });

  describe("addMeter", () => {
    it("requires admin — throws for a member", async () => {
      const t = convexTest(schema, modules);
      const { memberId, householdId } = await seedHouseholdWithAdminAndMember(t);

      await expect(
        t
          .withIdentity({ subject: memberId, tokenIdentifier: memberId })
          .mutation(api.meters.addMeter, { householdId, name: "New Meter" })
      ).rejects.toThrow("Not a household admin");
    });

    it("inserts a meter and sets activeMeterId if unset", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);

      const meterId = await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.meters.addMeter, { householdId, name: "  New Meter  " });

      const meter = await t.run(async (ctx) => ctx.db.get(meterId));
      expect(meter?.name).toBe("New Meter");

      const profile = await t.run(async (ctx) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique()
      );
      expect(profile?.activeMeterId).toBe(meterId);
    });

    it("rejects an empty trimmed name", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.meters.addMeter, { householdId, name: "   " })
      ).rejects.toThrow();
    });
  });

  describe("updateMeter", () => {
    it("requires admin of the meter's household", async () => {
      const t = convexTest(schema, modules);
      const { memberId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() })
      );

      await expect(
        t
          .withIdentity({ subject: memberId, tokenIdentifier: memberId })
          .mutation(api.meters.updateMeter, { meterId, name: "Renamed" })
      ).rejects.toThrow("Not a household admin");
    });

    it("patches only provided fields", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", {
          householdId,
          name: "M",
          meterNumber: "111",
          createdAt: Date.now(),
        })
      );

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.meters.updateMeter, { meterId, lowBalanceThreshold: 25 });

      const meter = await t.run(async (ctx) => ctx.db.get(meterId));
      expect(meter?.meterNumber).toBe("111");
      expect(meter?.lowBalanceThreshold).toBe(25);
    });

    it("rejects an empty trimmed name", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() })
      );

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.meters.updateMeter, { meterId, name: "   " })
      ).rejects.toThrow();
    });
  });

  describe("archiveMeter", () => {
    it("requires admin", async () => {
      const t = convexTest(schema, modules);
      const { memberId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() })
      );

      await expect(
        t
          .withIdentity({ subject: memberId, tokenIdentifier: memberId })
          .mutation(api.meters.archiveMeter, { meterId })
      ).rejects.toThrow("Not a household admin");
    });

    it("archives the meter and clears activeMeterId for members who had it active", async () => {
      const t = convexTest(schema, modules);
      const { adminId, memberId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() });
        const adminProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
        const memberProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", memberId))
          .unique();
        if (adminProfile) await ctx.db.patch(adminProfile._id, { activeMeterId: id });
        if (memberProfile) await ctx.db.patch(memberProfile._id, { activeMeterId: id });
        return id;
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.meters.archiveMeter, { meterId });

      const meter = await t.run(async (ctx) => ctx.db.get(meterId));
      expect(meter?.archived).toBe(true);

      const adminProfile = await t.run(async (ctx) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique()
      );
      const memberProfile = await t.run(async (ctx) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", memberId))
          .unique()
      );
      expect(adminProfile?.activeMeterId).toBeUndefined();
      expect(memberProfile?.activeMeterId).toBeUndefined();
    });

    it("archived meter is excluded from listMyMeters, and resolveMeter falls back to another non-archived meter", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);

      const { meterToArchive, meterToKeep } = await t.run(async (ctx) => {
        const meterToArchive = await ctx.db.insert("meters", {
          householdId,
          name: "Archive Me",
          createdAt: Date.now(),
        });
        const meterToKeep = await ctx.db.insert("meters", {
          householdId,
          name: "Keep Me",
          createdAt: Date.now() + 1,
        });
        const adminProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
        if (adminProfile) await ctx.db.patch(adminProfile._id, { activeMeterId: meterToArchive });
        return { meterToArchive, meterToKeep };
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.meters.archiveMeter, { meterId: meterToArchive });

      const listed = await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .query(api.meters.listMyMeters, {});
      expect(listed.map((m) => m.meterId)).not.toContain(meterToArchive);
      expect(listed.map((m) => m.meterId)).toContain(meterToKeep);

      const resolved = await t.run(async (ctx) => resolveMeter(ctx, adminId));
      expect(resolved?._id).toBe(meterToKeep);
    });

    it("resolveMeter returns null after archiving the only meter", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);

      const onlyMeterId = await t.run(async (ctx) => {
        const meterId = await ctx.db.insert("meters", {
          householdId,
          name: "Only Meter",
          createdAt: Date.now(),
        });
        const adminProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
        if (adminProfile) await ctx.db.patch(adminProfile._id, { activeMeterId: meterId });
        return meterId;
      });

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.meters.archiveMeter, { meterId: onlyMeterId });

      const resolved = await t.run(async (ctx) => resolveMeter(ctx, adminId));
      expect(resolved).toBeNull();
    });
  });

  describe("setActiveMeter", () => {
    it("rejects a non-member", async () => {
      const t = convexTest(schema, modules);
      const { householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() })
      );
      const strangerId = "stranger-1";

      await expect(
        t
          .withIdentity({ subject: strangerId, tokenIdentifier: strangerId })
          .mutation(api.meters.setActiveMeter, { meterId })
      ).rejects.toThrow("Unauthorized");
    });

    it("sets activeMeterId for a member of the meter's household", async () => {
      const t = convexTest(schema, modules);
      const { memberId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", { householdId, name: "M", createdAt: Date.now() })
      );

      await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .mutation(api.meters.setActiveMeter, { meterId });

      const profile = await t.run(async (ctx) =>
        ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", memberId))
          .unique()
      );
      expect(profile?.activeMeterId).toBe(meterId);
    });

    it("rejects an archived meter", async () => {
      const t = convexTest(schema, modules);
      const { adminId, householdId } = await seedHouseholdWithAdminAndMember(t);
      const meterId = await t.run(async (ctx) =>
        ctx.db.insert("meters", {
          householdId,
          name: "M",
          archived: true,
          createdAt: Date.now(),
        })
      );

      await expect(
        t
          .withIdentity({ subject: adminId, tokenIdentifier: adminId })
          .mutation(api.meters.setActiveMeter, { meterId })
      ).rejects.toThrow("Unauthorized");
    });
  });
});
