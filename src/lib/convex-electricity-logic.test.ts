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
    const readings = [
      { readingPre: 50, readingPost: 50, date: "2026-03-06", source: "onboarding" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats).not.toBeNull();
    expect(stats?.lastReading).toBe(50);
    expect(stats?.dailyBurnRate).toBe(0);
    expect(stats?.estimatedBalance).toBe(50);
    expect(stats?.isEstimatedBurnRate).toBe(true);
  });

  it("calculates burn rate with two purchase readings", () => {
    const readings = [
      { readingPre: 130, readingPost: 180, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 180, readingPost: 180, date: "2026-03-01", source: "purchase" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.dailyBurnRate).toBe(10);
    expect(stats?.estimatedBalance).toBe(180);
    expect(stats?.daysRemaining).toBe(18);
    expect(stats?.daysRemainingUntilLow).toBe(17);
  });

  it("accounts for purchases between readings", () => {
    const readings = [
      { readingPre: 130, readingPost: 160, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 200, readingPost: 200, date: "2026-03-01", source: "purchase" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.dailyBurnRate).toBe(14);
    expect(stats?.estimatedBalance).toBe(160);
  });

  it("burn rate uses readingPre - prev readingPost (no purchase join)", () => {
    const readings = [
      { readingPre: 140, readingPost: 180, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 180, readingPost: 200, date: "2026-03-01", source: "purchase" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.dailyBurnRate).toBe(12);
  });

  it("onboarding reading scenario (single reading, no burn rate)", () => {
    const readings = [
      { readingPre: 200, readingPost: 200, date: "2026-03-06", source: "onboarding" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats).not.toBeNull();
    expect(stats?.lastReading).toBe(200);
    expect(stats?.dailyBurnRate).toBe(0);
    expect(stats?.estimatedBalance).toBe(200);
    expect(stats?.isEstimatedBurnRate).toBe(true);
  });

  it("isEstimatedBurnRate: true when only onboarding reading exists", () => {
    const readings = [
      { readingPre: 150, readingPost: 150, date: "2026-03-05", source: "onboarding" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.isEstimatedBurnRate).toBe(true);
    expect(stats?.dailyBurnRate).toBe(0);
  });

  it("estimatedBalance uses readingPost of most recent reading as anchor", () => {
    const readings = [
      { readingPre: 40, readingPost: 90, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 100, readingPost: 150, date: "2026-03-01", source: "purchase" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.estimatedBalance).toBe(90);
  });

  it("excludes onboarding readings from burn rate calculation", () => {
    const readings = [
      { readingPre: 60, readingPost: 90, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 200, readingPost: 200, date: "2026-03-04", source: "onboarding" } as never,
    ];
    const threshold = 10;

    const stats = calculateConsumptionStats(readings, threshold);

    expect(stats?.dailyBurnRate).toBe(0);
    expect(stats?.isEstimatedBurnRate).toBe(true);
  });

  it("weighted average: 3 purchase readings — recent interval counts more", () => {
    // Interval 0 (Mar 1→6, 5 days): usage = 224−124 = 100 → rate = 20 kWh/day
    // Interval 1 (Feb 20→Mar 1, 9 days): usage = 160−124 = 36 → rate = 4 kWh/day (holiday)
    // weights: [1, 0.5], normalised [2/3, 1/3]
    // expected = 20×(2/3) + 4×(1/3) = 44/3 ≈ 14.667
    const readings = [
      { readingPre: 124, readingPost: 174, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 124, readingPost: 224, date: "2026-03-01", source: "purchase" } as never,
      { readingPre: 80, readingPost: 160, date: "2026-02-20", source: "purchase" } as never,
    ];

    const stats = calculateConsumptionStats(readings, 10);

    expect(stats?.dailyBurnRate).toBeCloseTo(44 / 3, 5);
    expect(stats?.isEstimatedBurnRate).toBe(false);
  });

  it("weighted average: outlier holiday period is smoothed across 4 readings", () => {
    // Interval 0 (Mar 1→6,  5 days): usage = 282−232 = 50  → rate = 10 kWh/day (normal)
    // Interval 1 (Feb 20→Mar 1, 9 days): usage = 200−182 = 18 → rate = 2 kWh/day (holiday)
    // Interval 2 (Feb 10→Feb 20, 10 days): usage = 200−100 = 100 → rate = 10 kWh/day (normal)
    // weights: [1, 0.5, 0.25], normalised [4/7, 2/7, 1/7]
    // expected = 10×(4/7) + 2×(2/7) + 10×(1/7) = (40+4+10)/7 = 54/7 ≈ 7.714
    const readings = [
      { readingPre: 232, readingPost: 282, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 182, readingPost: 282, date: "2026-03-01", source: "purchase" } as never,
      { readingPre: 100, readingPost: 200, date: "2026-02-20", source: "purchase" } as never,
      { readingPre: 50, readingPost: 200, date: "2026-02-10", source: "purchase" } as never,
    ];

    const stats = calculateConsumptionStats(readings, 10);

    expect(stats?.dailyBurnRate).toBeCloseTo(54 / 7, 5);
  });

  it("skips intervals with negative rates (data entry errors)", () => {
    // Interval 0 (Mar 1→6, 5 days): usage = 100−90 = 10 → rate = 2 kWh/day (valid)
    // Interval 1 (Feb 20→Mar 1, 9 days): usage = 70−80 = −10 → negative, skip
    // Only interval 0 is used → rate = 2
    const readings = [
      { readingPre: 90, readingPost: 140, date: "2026-03-06", source: "purchase" } as never,
      { readingPre: 80, readingPost: 100, date: "2026-03-01", source: "purchase" } as never,
      { readingPre: 50, readingPost: 70, date: "2026-02-20", source: "purchase" } as never,
    ];

    const stats = calculateConsumptionStats(readings, 10);

    expect(stats?.dailyBurnRate).toBe(2);
  });
});
