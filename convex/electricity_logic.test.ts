import { describe, it, expect } from "vitest";
import { selectActiveRates } from "./electricity_logic";

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
