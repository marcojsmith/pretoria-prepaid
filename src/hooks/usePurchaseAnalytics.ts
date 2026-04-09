import { useCallback } from "react";
import { calculateRefillIntervals } from "@/lib/electricity";
import type { Purchase } from "@/lib/electricity";

export function usePurchaseAnalytics(purchases: Purchase[]): {
  getRefillAnalysis: () => ReturnType<typeof calculateRefillIntervals>;
} {
  const getRefillAnalysis = useCallback(() => {
    return calculateRefillIntervals(purchases);
  }, [purchases]);

  return { getRefillAnalysis };
}
