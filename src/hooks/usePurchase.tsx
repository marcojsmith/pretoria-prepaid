import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";
import { Purchase, TierBreakdown, getCurrentMonth } from "@/lib/electricity";
import { Id } from "../../convex/_generated/dataModel";

export function usePurchases() {
  const purchasesData = useQuery(api.purchases.getPurchases);
  const addPurchaseMutation = useMutation(api.purchases.addPurchase);
  const deletePurchaseMutation = useMutation(api.purchases.deletePurchase);

  const purchases: Purchase[] = (purchasesData ?? []).map((p) => ({
    _id: p._id,
    date: p.date,
    units: p.units,
    cost: p.cost,
    amountPaid: p.amountPaid,
    tierBreakdown: (p.tierBreakdown as unknown as TierBreakdown[]) || [],
  }));

  const addPurchase = useCallback(
    async (units: number, amountPaid: number, date: string) => {
      await addPurchaseMutation({
        date,
        units,
        cost: 0, // Server will recalculate this
        amountPaid,
      });
    },
    [addPurchaseMutation]
  );

  const deletePurchase = useCallback(
    async (id: string) => {
      await deletePurchaseMutation({ id: id as Id<"purchases"> });
    },
    [deletePurchaseMutation]
  );

  const getCurrentMonthPurchases = useCallback(() => {
    const currentMonth = getCurrentMonth();
    return purchases.filter((p) => p.date.startsWith(currentMonth));
  }, [purchases]);

  const getMonthlyStats = useCallback(() => {
    const monthlyMap = new Map<string, { units: number; cost: number; purchases: number }>();

    purchases.forEach((p) => {
      const monthKey = p.date.substring(0, 7);
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
  }, [purchases]);

  const getAverageMonthlyUsage = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats.filter((s) => s.month !== currentMonth).slice(0, 3);
    if (previousMonths.length === 0) return 0;
    return Math.round(previousMonths.reduce((sum, s) => sum + s.units, 0) / previousMonths.length);
  }, [getMonthlyStats]);

  const getDailyAverageUsage = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats.filter((s) => s.month !== currentMonth).slice(0, 3);
    if (previousMonths.length === 0) return 0;
    const totalUnits = previousMonths.reduce((sum, s) => sum + s.units, 0);
    const totalDays = previousMonths.length * 30;
    return totalUnits / totalDays;
  }, [getMonthlyStats]);

  const getAverageMonthlyCost = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats.filter((s) => s.month !== currentMonth).slice(0, 3);
    if (previousMonths.length === 0) return 0;
    return previousMonths.reduce((sum, s) => sum + s.cost, 0) / previousMonths.length;
  }, [getMonthlyStats]);

  const currentMonthPurchases = getCurrentMonthPurchases();
  const unitsThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.units, 0);
  const costThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.amountPaid, 0);

  return {
    purchases,
    unitsThisMonth,
    costThisMonth,
    loading: purchasesData === undefined,
    addPurchase,
    deletePurchase,
    getCurrentMonthPurchases,
    getMonthlyStats,
    getAverageMonthlyUsage,
    getDailyAverageUsage,
    getAverageMonthlyCost,
  };
}
