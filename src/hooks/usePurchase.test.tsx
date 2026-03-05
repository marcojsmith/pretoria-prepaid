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

    const monthlyStats = result.current.getMonthlyStats();
    expect(monthlyStats.length).toBeGreaterThan(0);

    const currentMonthPurchases = result.current.getCurrentMonthPurchases();
    expect(currentMonthPurchases).toHaveLength(2);

    expect(result.current.getDailyAverageUsage()).toBeGreaterThan(0);
    expect(result.current.getAverageMonthlyUsage()).toBe(30); // only Jan is a full previous month in the slice
  });

  it("returns loading state when query returns undefined", () => {
    (convexReact.useQuery as any).mockReturnValue(undefined);

    const { result } = renderHook(() => usePurchases());

    expect(result.current.loading).toBe(true);
    expect(result.current.purchases).toHaveLength(0);
  });
});
