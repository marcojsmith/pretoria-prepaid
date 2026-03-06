import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateConsumptionStats } from "../../convex/electricity_logic";

describe("convex electricity logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates stats correctly with minimal data", () => {
    const readings = [{ reading: 50, date: "2026-03-06" } as never];
    const purchases = [] as never;
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, purchases, threshold);

    expect(stats).not.toBeNull();
    expect(stats?.lastReading).toBe(50);
    expect(stats?.dailyBurnRate).toBe(0); // Not enough data for burn rate
    expect(stats?.estimatedBalance).toBe(50);
    expect(stats?.isEstimatedBurnRate).toBe(true);
  });

  it("calculates burn rate with two readings", () => {
    const readings = [
      { reading: 50, date: "2026-03-06" } as never,
      { reading: 100, date: "2026-03-01" } as never,
    ];
    const purchases = [] as never;
    const threshold = 10;

    // 100 - 50 = 50 units used in 5 days = 10 units/day
    const stats = calculateConsumptionStats(readings, purchases, threshold);

    expect(stats?.dailyBurnRate).toBe(10);
    expect(stats?.estimatedBalance).toBe(50);
    expect(stats?.daysRemaining).toBe(5);
    expect(stats?.daysRemainingUntilLow).toBe(4);
  });

  it("accounts for purchases between readings", () => {
    const readings = [
      { reading: 80, date: "2026-03-06" } as never,
      { reading: 100, date: "2026-03-01" } as never,
    ];
    // Purchase of 50 units on March 3rd
    const purchases = [{ units: 50, date: "2026-03-03" } as never];
    const threshold = 10;

    // Usage = (100 + 50) - 80 = 70 units in 5 days = 14 units/day
    const stats = calculateConsumptionStats(readings, purchases, threshold);

    expect(stats?.dailyBurnRate).toBe(14);
    expect(stats?.estimatedBalance).toBe(80);
  });
});
