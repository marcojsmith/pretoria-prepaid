import { useCallback } from "react";
import { getCurrentMonth } from "@/lib/electricity";
import type { Purchase } from "@/lib/electricity";
import { DATE_MONTH_LENGTH, AVERAGE_MONTHS_LOOKBACK, MONTHS_IN_YEAR } from "@/lib/constants";

export interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

export function calculateMonthlyStats(purchases: Purchase[]): MonthlyStat[] {
  const monthlyMap = new Map<string, { units: number; cost: number; purchases: number }>();

  purchases.forEach((p) => {
    const monthKey = p.date.substring(0, DATE_MONTH_LENGTH);
    const existing = monthlyMap.get(monthKey) || { units: 0, cost: 0, purchases: 0 };
    monthlyMap.set(monthKey, {
      units: existing.units + p.units,
      cost: existing.cost + p.amountPaid,
      purchases: existing.purchases + 1,
    });
  });

  return Array.from(monthlyMap.entries())
    .map(([month, stats]) => ({ month, ...stats }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getPreviousMonths(monthlyStats: MonthlyStat[], currentMonth: string): MonthlyStat[] {
  return monthlyStats.filter((s) => s.month !== currentMonth).slice(0, AVERAGE_MONTHS_LOOKBACK);
}

export function usePurchaseStats(purchases: Purchase[]): {
  getMonthlyStats: () => MonthlyStat[];
  getAverageMonthlyUsage: () => number;
  getDailyAverageUsage: () => number;
  getAverageMonthlyCost: () => number;
} {
  const getMonthlyStats = useCallback(() => calculateMonthlyStats(purchases), [purchases]);

  const getAverageMonthlyUsage = useCallback(() => {
    const previousMonths = getPreviousMonths(getMonthlyStats(), getCurrentMonth());
    if (previousMonths.length === 0) return 0;
    return Math.round(previousMonths.reduce((sum, s) => sum + s.units, 0) / previousMonths.length);
  }, [getMonthlyStats]);

  const getDailyAverageUsage = useCallback(() => {
    const previousMonths = getPreviousMonths(getMonthlyStats(), getCurrentMonth());
    if (previousMonths.length === 0) return 0;
    const totalUnits = previousMonths.reduce((sum, s) => sum + s.units, 0);
    const totalDays = previousMonths.reduce((sum, s) => {
      const [year, month] = s.month.split("-").map(Number) as [number, number];
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        month >= 1 &&
        month <= MONTHS_IN_YEAR
      ) {
        return sum + getDaysInMonth(year, month);
      }
      return sum;
    }, 0);
    return totalDays > 0 ? totalUnits / totalDays : 0;
  }, [getMonthlyStats]);

  const getAverageMonthlyCost = useCallback(() => {
    const previousMonths = getPreviousMonths(getMonthlyStats(), getCurrentMonth());
    if (previousMonths.length === 0) return 0;
    return previousMonths.reduce((sum, s) => sum + s.cost, 0) / previousMonths.length;
  }, [getMonthlyStats]);

  return { getMonthlyStats, getAverageMonthlyUsage, getDailyAverageUsage, getAverageMonthlyCost };
}
