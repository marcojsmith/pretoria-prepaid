import { describe, it, expect, vi, afterEach } from "vitest";
import {
  selectActiveRates,
  calculateConsumptionStats,
  DEFAULT_BURN_RATE,
} from "./electricity_logic";

const legacy = [
  { tier_number: 1, rate: 3.42585 },
  { tier_number: 2, rate: 4.00936 },
];

const period2026 = [
  { tier_number: 1, rate: 3.7274, effectiveFrom: "2026-07-01" },
  { tier_number: 2, rate: 4.3622, effectiveFrom: "2026-07-01" },
];

describe("selectActiveRates", () => {
  it("returns legacy rows (no effectiveFrom) when no dated rows exist", () => {
    const result = selectActiveRates(legacy, "2026-01-01");
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.tier_number === 1)?.rate).toBe(3.42585);
  });

  it("keeps legacy rows before a dated period's effectiveFrom", () => {
    const result = selectActiveRates([...legacy, ...period2026], "2026-06-30");
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.tier_number === 1)?.rate).toBe(3.42585);
    expect(result.find((r) => r.tier_number === 2)?.rate).toBe(4.00936);
  });

  it("uses the dated period on its effectiveFrom date and after", () => {
    for (const asOf of ["2026-07-01", "2026-08-15"]) {
      const result = selectActiveRates([...legacy, ...period2026], asOf);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.tier_number === 1)?.rate).toBe(3.7274);
      expect(result.find((r) => r.tier_number === 2)?.rate).toBe(4.3622);
    }
  });

  it("picks the latest applicable of two dated periods", () => {
    const period2027 = [{ tier_number: 1, rate: 4.1, effectiveFrom: "2027-07-01" }];
    const all = [...legacy, ...period2026, ...period2027];

    expect(selectActiveRates(all, "2026-12-01").find((r) => r.tier_number === 1)?.rate).toBe(
      3.7274
    );
    expect(selectActiveRates(all, "2027-07-01").find((r) => r.tier_number === 1)?.rate).toBe(4.1);
  });
});

describe("calculateConsumptionStats - SAST day boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts a reading from the previous SAST calendar date at 00:00 SAST as a full elapsed day", () => {
    // "Now" is 2026-09-04T00:30 SAST (= 2026-09-03T22:30Z), i.e. just after the SAST
    // midnight boundary. The reading was taken on the previous SAST calendar date,
    // "2026-09-03", at 00:00 SAST. This should count as exactly 1 whole elapsed day,
    // not a fractional ~0.9375 days as a naive UTC ms-diff against real "now" would give.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T22:30:00.000Z"));

    const stats = calculateConsumptionStats(
      [
        {
          date: "2026-09-03",
          readingPre: 100,
          readingPost: 100,
          source: "onboarding",
        },
      ],
      20
    );

    expect(stats).not.toBeNull();
    // No purchase intervals available, so the default burn rate is used.
    expect(stats?.estimatedBalance).toBe(100 - 1 * DEFAULT_BURN_RATE);
  });
});
