import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePurchases } from "./usePurchase";
import * as convexReact from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("usePurchases Hook", () => {
  const mockPurchases = [
    { _id: "1", amountPaid: 100, units: 30, date: "2024-01-15T10:00:00.000Z", cost: 100 },
    { _id: "2", amountPaid: 200, units: 60, date: "2024-02-15T10:00:00.000Z", cost: 200 },
    { _id: "3", amountPaid: 150, units: 45, date: "2024-02-20T10:00:00.000Z", cost: 150 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    // Set system time to Feb 2024
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates stats correctly", () => {
    (convexReact.useQuery as any).mockReturnValue(mockPurchases);

    const { result } = renderHook(() => usePurchases());

    expect(result.current.loading).toBe(false);
    expect(result.current.purchases).toHaveLength(3);

    // Feb 2024 purchases: 60 + 45 = 105 units
    expect(result.current.unitsThisMonth).toBe(105);
    expect(result.current.costThisMonth).toBe(350);
  });

  it("caches purchases to localStorage when fetched from convex", () => {
    (convexReact.useQuery as any).mockReturnValue(mockPurchases);

    renderHook(() => usePurchases());

    const cached = JSON.parse(localStorage.getItem("purchases_history") || "[]");
    expect(cached).toHaveLength(3);
    expect(cached[0].units).toBe(30);
  });

  it("returns cached purchases from localStorage when convex returns undefined (offline/loading)", () => {
    // Pre-populate cache
    const cachedPurchases = [
      {
        _id: "cached-1",
        amountPaid: 50,
        units: 15,
        date: "2024-01-01T10:00:00.000Z",
        cost: 50,
        tierBreakdown: [],
      },
    ];
    localStorage.setItem("purchases_history", JSON.stringify(cachedPurchases));

    // Simulate offline/loading (useQuery returns undefined)
    (convexReact.useQuery as any).mockReturnValue(undefined);

    const { result } = renderHook(() => usePurchases());

    expect(result.current.purchases).toHaveLength(1);
    expect(result.current.purchases[0]._id).toBe("cached-1");
    // It should not be considered "loading" if we have cached data
    expect(result.current.loading).toBe(false);
  });

  it("returns loading state when query returns undefined and cache is empty", () => {
    (convexReact.useQuery as any).mockReturnValue(undefined);

    const { result } = renderHook(() => usePurchases());

    expect(result.current.loading).toBe(true);
    expect(result.current.purchases).toHaveLength(0);
  });
});
