/// <reference types="vite/client" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

const mockSendNotification = vi
  .fn<(...args: unknown[]) => Promise<void>>()
  .mockResolvedValue(undefined);
const mockSetVapidDetails = vi.fn<(...args: unknown[]) => void>();

vi.mock("web-push", () => ({
  default: {
    sendNotification: (...args: unknown[]): Promise<void> => mockSendNotification(...args),
    setVapidDetails: (...args: unknown[]): void => mockSetVapidDetails(...args),
  },
}));

const PUSH_SUBSCRIPTION = {
  endpoint: "https://example.com/push",
  expirationTime: null,
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

async function seedProfile(
  t: ReturnType<typeof convexTest>,
  options: { userId: string; email: string }
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("profiles", {
      userId: options.userId,
      email: options.email,
      pushNotificationsEnabled: true,
      pushSubscription: PUSH_SUBSCRIPTION,
    });
  });
}

async function seedHousehold(
  t: ReturnType<typeof convexTest>,
  options: { adminUserId: string; memberUserIds: string[]; name: string }
): Promise<Id<"households">> {
  return await t.run(async (ctx) => {
    const householdId = await ctx.db.insert("households", {
      adminUserId: options.adminUserId,
      name: options.name,
      createdAt: Date.now(),
    });
    await ctx.db.insert("household_members", {
      householdId,
      userId: options.adminUserId,
      role: "admin",
      joinedAt: Date.now(),
    });
    for (const userId of options.memberUserIds) {
      await ctx.db.insert("household_members", {
        householdId,
        userId,
        role: "member",
        joinedAt: Date.now(),
      });
    }
    return householdId;
  });
}

async function seedMeterWithReading(
  t: ReturnType<typeof convexTest>,
  options: {
    householdId: Id<"households">;
    name: string;
    lowBalanceThreshold: number;
    readingPost: number;
    lastAlertSent?: number;
  }
): Promise<Id<"meters">> {
  return await t.run(async (ctx) => {
    const meterId = await ctx.db.insert("meters", {
      householdId: options.householdId,
      name: options.name,
      lowBalanceThreshold: options.lowBalanceThreshold,
      createdAt: Date.now(),
      ...(options.lastAlertSent !== undefined ? { lastAlertSent: options.lastAlertSent } : {}),
    });
    await ctx.db.insert("meter_readings", {
      userId: options.householdId, // unused legacy field for meter-scoped readings
      meterId,
      date: new Date().toISOString().split("T")[0] ?? "2024-01-01",
      readingPre: options.readingPost,
      readingPost: options.readingPost,
      source: "onboarding",
    });
    return meterId;
  });
}

function makeGoneError(): Error & { statusCode: number } {
  return Object.assign(new Error("Gone"), { statusCode: 410 });
}

describe("alerts.checkLowBalances", () => {
  beforeEach(() => {
    mockSendNotification.mockClear();
    mockSetVapidDetails.mockClear();
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
    vi.stubEnv("VAPID_CONTACT_EMAIL", "alerts@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("notifies every subscribed household member for a breaching meter, naming it when the household has multiple meters", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });
    await seedProfile(t, { userId: "member-1", email: "member1@test.com" });

    const householdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: ["member-1"],
      name: "Two Meter House",
    });

    await seedMeterWithReading(t, {
      householdId,
      name: "Main House",
      lowBalanceThreshold: 10,
      readingPost: 5, // below threshold -> breach
    });
    await seedMeterWithReading(t, {
      householdId,
      name: "Garage",
      lowBalanceThreshold: 10,
      readingPost: 100, // above threshold -> no breach
    });

    await t.action(api.alerts.checkLowBalances, {});

    // 2 subscribed members notified for the single breaching meter
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    for (const call of mockSendNotification.mock.calls) {
      const payload = JSON.parse(call[1] as string) as { body: string };
      expect(payload.body).toContain("Main House");
    }
  });

  it("applies cooldown per-meter, not per-profile: a recently-alerted meter is skipped even if another meter in the same alert run is not", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });
    await seedProfile(t, { userId: "admin-2", email: "admin2@test.com" });

    const cooledHouseholdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: [],
      name: "Cooled House",
    });
    const freshHouseholdId = await seedHousehold(t, {
      adminUserId: "admin-2",
      memberUserIds: [],
      name: "Fresh House",
    });

    await seedMeterWithReading(t, {
      householdId: cooledHouseholdId,
      name: "Cooled Meter",
      lowBalanceThreshold: 10,
      readingPost: 5,
      lastAlertSent: Date.now() - 60 * 60 * 1000, // alerted 1 hour ago, within 24h cooldown
    });
    await seedMeterWithReading(t, {
      householdId: freshHouseholdId,
      name: "Fresh Meter",
      lowBalanceThreshold: 10,
      readingPost: 5,
    });

    await t.action(api.alerts.checkLowBalances, {});

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a meter whose estimated balance is above its threshold", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });

    const householdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: [],
      name: "Healthy House",
    });

    await seedMeterWithReading(t, {
      householdId,
      name: "Healthy Meter",
      lowBalanceThreshold: 10,
      readingPost: 100,
    });

    await t.action(api.alerts.checkLowBalances, {});

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("updates the meter's lastAlertSent when the notification is delivered successfully", async () => {
    const t = convexTest(schema, modules);
    mockSendNotification.mockResolvedValueOnce(undefined);
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });

    const householdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: [],
      name: "Delivered House",
    });
    const meterId = await seedMeterWithReading(t, {
      householdId,
      name: "Delivered Meter",
      lowBalanceThreshold: 10,
      readingPost: 5,
    });

    await t.action(api.alerts.checkLowBalances, {});

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const meter = await t.run(async (ctx) => await ctx.db.get(meterId));
    expect(meter?.lastAlertSent).toBeTypeOf("number");
  });

  it("does NOT update the meter's lastAlertSent when every recipient's send fails (expired subscription, 410)", async () => {
    const t = convexTest(schema, modules);
    mockSendNotification.mockRejectedValueOnce(makeGoneError());
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });

    const householdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: [],
      name: "AllFailed House",
    });
    const meterId = await seedMeterWithReading(t, {
      householdId,
      name: "AllFailed Meter",
      lowBalanceThreshold: 10,
      readingPost: 5,
    });

    await t.action(api.alerts.checkLowBalances, {});

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const meter = await t.run(async (ctx) => await ctx.db.get(meterId));
    expect(meter?.lastAlertSent).toBeUndefined();
  });

  it("updates the meter's lastAlertSent when at least one of multiple recipients is delivered (mixed success/failure)", async () => {
    const t = convexTest(schema, modules);
    mockSendNotification.mockRejectedValueOnce(makeGoneError()).mockResolvedValueOnce(undefined);
    await seedProfile(t, { userId: "admin-1", email: "admin1@test.com" });
    await seedProfile(t, { userId: "member-1", email: "member1@test.com" });

    const householdId = await seedHousehold(t, {
      adminUserId: "admin-1",
      memberUserIds: ["member-1"],
      name: "Mixed House",
    });
    const meterId = await seedMeterWithReading(t, {
      householdId,
      name: "Mixed Meter",
      lowBalanceThreshold: 10,
      readingPost: 5,
    });

    await t.action(api.alerts.checkLowBalances, {});

    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const meter = await t.run(async (ctx) => await ctx.db.get(meterId));
    expect(meter?.lastAlertSent).toBeTypeOf("number");
  });
});
