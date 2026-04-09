import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePurchaseAnalytics } from "./usePurchaseAnalytics";
import type { Purchase } from "@/lib/electricity";

describe("usePurchaseAnalytics", () => {
  it("returns empty array for empty purchases", () => {
    const { result } = renderHook(() => usePurchaseAnalytics([]));
    expect(result.current.getRefillAnalysis()).toHaveLength(0);
  });

  it("returns correct refill interval data", () => {
    const purchases: Purchase[] = [
      { _id: "1", date: "2024-03-01", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      { _id: "2", date: "2024-03-05", units: 50, amountPaid: 150, cost: 150, tierBreakdown: [] },
    ];

    const { result } = renderHook(() => usePurchaseAnalytics(purchases));
    const analysis = result.current.getRefillAnalysis();

    expect(analysis).toHaveLength(2);
    expect((analysis[1] as { daysSinceLastRefill: number | null }).daysSinceLastRefill).toBe(4);
  });
});
