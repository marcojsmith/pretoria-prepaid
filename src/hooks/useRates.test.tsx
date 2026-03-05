import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRates } from "./useRates";
import { useQuery } from "convex/react";

// Mock convex/react
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("useRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("returns rates from convex when online", () => {
    const mockRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.5 },
    ];
    (useQuery as any).mockReturnValue(mockRates);

    const { result } = renderHook(() => useRates());

    expect(result.current.rates).toHaveLength(1);
    expect(result.current.rates[0].rate).toBe(3.5);
    expect(result.current.loading).toBe(false);
  });

  it("caches rates to localStorage when fetched from convex", () => {
    const mockRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.5 },
    ];
    (useQuery as any).mockReturnValue(mockRates);

    renderHook(() => useRates());

    const cached = JSON.parse(localStorage.getItem("electricity_rates") || "[]");
    expect(cached).toHaveLength(1);
    expect(cached[0].rate).toBe(3.5);
  });

  it("returns cached rates from localStorage when convex returns undefined (offline/loading)", () => {
    // Pre-populate cache
    const cachedRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 4.0 },
    ];
    localStorage.setItem("electricity_rates", JSON.stringify(cachedRates));

    // Simulate offline/loading (useQuery returns undefined)
    (useQuery as any).mockReturnValue(undefined);

    const { result } = renderHook(() => useRates());

    expect(result.current.rates).toHaveLength(1);
    expect(result.current.rates[0].rate).toBe(4.0);
    // Even if it's using cache, it might still be 'loading' from network perspective,
    // but the app can proceed.
  });
});
