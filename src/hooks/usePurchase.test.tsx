import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePurchases } from "./usePurchase";
import * as convexReact from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user1" } })),
}));

describe("usePurchases hook", () => {
  it("returns formatted purchases", () => {
    (convexReact.useQuery as any).mockReturnValue([
      { _id: "1", date: "2024-01-01", units: 100, cost: 342, amountPaid: 342, tierBreakdown: [] },
    ]);

    const { result } = renderHook(() => usePurchases());

    expect(result.current.purchases.length).toBe(1);
    expect(result.current.purchases[0].id).toBe("1");
    expect(result.current.loading).toBe(false);
  });

  it("calculates monthly stats correctly", () => {
    (convexReact.useQuery as any).mockReturnValue([
      { _id: "1", date: "2024-01-01", units: 100, cost: 342, amountPaid: 342, tierBreakdown: [] },
      { _id: "2", date: "2024-01-15", units: 50, cost: 200, amountPaid: 200, tierBreakdown: [] },
    ]);

    const { result } = renderHook(() => usePurchases());
    const stats = result.current.getMonthlyStats();

    expect(stats.length).toBe(1);
    expect(stats[0].units).toBe(150);
    expect(stats[0].purchases).toBe(2);
  });

  it("calculates average monthly usage correctly", () => {
    (convexReact.useQuery as any).mockReturnValue([
      { _id: "1", date: "2023-12-01", units: 300, cost: 1000, amountPaid: 1000, tierBreakdown: [] },
      { _id: "2", date: "2024-01-01", units: 100, cost: 342, amountPaid: 342, tierBreakdown: [] }, // Assume current month is after Jan 2024
    ]);

    // Mock getCurrentMonth to return something after 2024-01
    vi.mock("../lib/electricity", async () => {
      const actual = (await vi.importActual("../lib/electricity")) as any;
      return {
        ...actual,
        getCurrentMonth: () => "2024-02",
      };
    });

    const { result } = renderHook(() => usePurchases());
    const avg = result.current.getAverageMonthlyUsage();

    // Should average Dec and Jan: (300 + 100) / 2 = 200
    expect(avg).toBe(200);
  });
});
