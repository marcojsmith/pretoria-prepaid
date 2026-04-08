import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { getCurrentMonth, calculateRefillIntervals, type RefillInterval } from "@/lib/electricity";
import type { Purchase, TierBreakdown } from "@/lib/electricity";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DATE_MONTH_LENGTH, AVERAGE_MONTHS_LOOKBACK } from "@/lib/constants";

const PURCHASES_CACHE_KEY = "purchases_history";
const QUEUE_CACHE_KEY = "offline_purchases_queue";

type QueuedPurchase =
  | {
      id: string;
      type: "add";
      units: number;
      amountPaid: number;
      date: string;
      meterReading: number;
    }
  | {
      id: string;
      type: "delete";
      purchaseId: string;
    };

interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

export interface UsePurchasesReturn {
  purchases: Purchase[];
  unitsThisMonth: number;
  costThisMonth: number;
  loading: boolean;
  addPurchase: (options: {
    units: number;
    amountPaid: number;
    date: string;
    meterReading: number;
  }) => Promise<void>;
  addBatchPurchases: (
    items: { units: number; amountPaid: number; date: string; meterReading: number }[]
  ) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  getCurrentMonthPurchases: () => Purchase[];
  getMonthlyStats: () => MonthlyStat[];
  getAverageMonthlyUsage: () => number;
  getDailyAverageUsage: () => number;
  getAverageMonthlyCost: () => number;
  getRefillAnalysis: () => RefillInterval[];
  offlineCount: number;
}

// eslint-disable-next-line llm-core/max-function-length
export function usePurchases(): UsePurchasesReturn {
  const purchasesData = useQuery(api.purchases.getPurchases);
  const addPurchaseMutation = useMutation(api.purchases.addPurchase);
  const deletePurchaseMutation = useMutation(api.purchases.deletePurchase);

  const [confirmedPurchases, setConfirmedPurchases] = useState<Purchase[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedPurchase[]>([]);
  const isSyncing = useRef(false);

  // Load from cache on mount
  useEffect(() => {
    const cachedPurchases = localStorage.getItem(PURCHASES_CACHE_KEY);
    if (cachedPurchases) {
      try {
        setConfirmedPurchases(JSON.parse(cachedPurchases) as Purchase[]);
      } catch (error) {
        console.error("Failed to parse cached purchases", error);
      }
    }

    const cachedQueue = localStorage.getItem(QUEUE_CACHE_KEY);
    if (cachedQueue) {
      try {
        setOfflineQueue(JSON.parse(cachedQueue) as QueuedPurchase[]);
      } catch (error) {
        console.error("Failed to parse offline queue", error);
      }
    }
  }, []);

  // Sync when coming online
  useEffect(() => {
    const syncQueue = async () => {
      if (offlineQueue.length === 0 || isSyncing.current || !navigator.onLine) return;

      isSyncing.current = true;
      const currentQueue = [...offlineQueue];

      toast.info("Syncing offline actions...", {
        description: String(currentQueue.length) + " items",
      });

      const remainingItems = [...currentQueue];
      for (const item of currentQueue) {
        if (!navigator.onLine) break;

        try {
          if (item.type === "add") {
            await addPurchaseMutation({
              date: item.date,
              units: item.units,
              cost: 0,
              amountPaid: item.amountPaid,
              meterReading: item.meterReading,
            });
          } else if (item.type === "delete") {
            await deletePurchaseMutation({ id: item.purchaseId as Id<"purchases"> });
          }

          remainingItems.shift();
          const updatedQueue = [...remainingItems];
          setOfflineQueue(updatedQueue);
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(updatedQueue));
        } catch (error) {
          console.error("Failed to sync action", error);
          break; // Stop if sync fails
        }
      }

      if (remainingItems.length === 0) {
        toast.success("All offline actions synced successfully!");
      }
      isSyncing.current = false;
    };

    window.addEventListener("online", () => void syncQueue());
    if (navigator.onLine) void syncQueue();

    return () => window.removeEventListener("online", () => void syncQueue());
  }, [offlineQueue, addPurchaseMutation, deletePurchaseMutation]);

  // Update confirmed purchases when network data arrives
  useEffect(() => {
    if (!purchasesData) {
      return;
    }

    const mappedPurchases: Purchase[] = purchasesData.map((p) => ({
      _id: p._id,
      date: p.date,
      units: p.units,
      cost: p.cost,
      amountPaid: p.amountPaid,
      tierBreakdown: (p.tierBreakdown as unknown as TierBreakdown[]) || [],
    }));
    setConfirmedPurchases(mappedPurchases);
    localStorage.setItem(PURCHASES_CACHE_KEY, JSON.stringify(mappedPurchases));
  }, [purchasesData]);

  // Combine confirmed and offline purchases for the UI
  const purchases = useMemo(() => {
    const deletedIds = new Set(
      offlineQueue.filter((item) => item.type === "delete").map((item) => item.purchaseId)
    );

    const optimisticPurchases: Purchase[] = offlineQueue
      .filter((item) => item.type === "add")
      .map((item) => ({
        _id: item.id,
        date: item.date,
        units: item.units,
        cost: 0,
        amountPaid: item.amountPaid,
        tierBreakdown: [],
        isOffline: true,
      }));

    const visibleConfirmed = confirmedPurchases.filter((p) => !deletedIds.has(p._id));

    return [...optimisticPurchases, ...visibleConfirmed];
  }, [confirmedPurchases, offlineQueue]);

  const addPurchase = useCallback(
    async (options: { units: number; amountPaid: number; date: string; meterReading: number }) => {
      const { units, amountPaid, date, meterReading } = options;

      if (!navigator.onLine) {
        const newOfflineItem: QueuedPurchase = {
          id: `offline-${Date.now()}`,
          type: "add",
          units,
          amountPaid,
          date,
          meterReading,
        };

        setOfflineQueue((prev) => {
          const newQueue = [...prev, newOfflineItem];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Purchase saved offline. Will sync when reconnected.");
        return;
      }

      try {
        await addPurchaseMutation({
          date,
          units,
          cost: 0,
          amountPaid,
          meterReading,
        });
      } catch (error) {
        console.warn("Mutation failed, queuing instead", error);
        const newOfflineItem: QueuedPurchase = {
          id: `offline-${Date.now()}`,
          type: "add",
          units,
          amountPaid,
          date,
          meterReading,
        };
        setOfflineQueue((prev) => {
          const newQueue = [...prev, newOfflineItem];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Purchase saved offline. Will sync when reconnected.");
      }
    },
    [addPurchaseMutation]
  );

  const addBatchPurchases = useCallback(
    async (items: { units: number; amountPaid: number; date: string; meterReading: number }[]) => {
      const offlineItems: QueuedPurchase[] = [];
      let successCount = 0;

      if (!navigator.onLine) {
        items.forEach((item, index) => {
          offlineItems.push({
            id: `offline-${Date.now()}-${index}`,
            type: "add",
            units: item.units,
            amountPaid: item.amountPaid,
            date: item.date,
            meterReading: item.meterReading,
          });
        });

        setOfflineQueue((prev) => {
          const newQueue = [...prev, ...offlineItems];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Purchases saved offline.", {
          description: String(items.length) + " purchases",
        });
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        try {
          await addPurchaseMutation({
            date: item.date,
            units: item.units,
            cost: 0,
            amountPaid: item.amountPaid,
            meterReading: item.meterReading,
          });
          successCount++;
        } catch (error) {
          console.warn("Batch item failed, queuing instead", error);
          offlineItems.push({
            id: `offline-${Date.now()}-${i}`,
            type: "add",
            units: item.units,
            amountPaid: item.amountPaid,
            date: item.date,
            meterReading: item.meterReading,
          });
        }
      }

      if (offlineItems.length > 0) {
        setOfflineQueue((prev) => {
          const newQueue = [...prev, ...offlineItems];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Imported purchases. Some items queued for retry.", {
          description:
            "Imported: " + String(successCount) + ", queued: " + String(offlineItems.length),
        });
      } else {
        toast.success(`Imported all ${successCount} purchases.`);
      }
    },
    [addPurchaseMutation]
  );

  const deletePurchase = useCallback(
    async (id: string) => {
      // If it's a pending addition, just remove it from the queue
      if (id.startsWith("offline-")) {
        setOfflineQueue((prev) => {
          const newQueue = prev.filter((item) => item.id !== id);
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        return;
      }

      if (!navigator.onLine) {
        const newDeleteAction: QueuedPurchase = {
          id: `delete-${Date.now()}`,
          type: "delete",
          purchaseId: id,
        };
        setOfflineQueue((prev) => {
          const newQueue = [...prev, newDeleteAction];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Delete action saved offline. Will sync when reconnected.");
        return;
      }

      try {
        await deletePurchaseMutation({ id: id as Id<"purchases"> });
      } catch (error) {
        console.warn("Delete mutation failed, queuing instead", error);
        const newDeleteAction: QueuedPurchase = {
          id: `delete-${Date.now()}`,
          type: "delete",
          purchaseId: id,
        };
        setOfflineQueue((prev) => {
          const newQueue = [...prev, newDeleteAction];
          localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(newQueue));
          return newQueue;
        });
        toast.info("Delete action saved offline. Will sync when reconnected.");
      }
    },
    [deletePurchaseMutation]
  );

  const getCurrentMonthPurchases = useCallback(() => {
    const currentMonth = getCurrentMonth();
    return purchases.filter((p) => p.date && p.date.startsWith(currentMonth));
  }, [purchases]);

  const getMonthlyStats = useCallback(() => {
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
  }, [purchases]);

  const getAverageMonthlyUsage = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats
      .filter((s) => s.month !== currentMonth)
      .slice(0, AVERAGE_MONTHS_LOOKBACK);
    if (previousMonths.length === 0) return 0;
    return Math.round(previousMonths.reduce((sum, s) => sum + s.units, 0) / previousMonths.length);
  }, [getMonthlyStats]);

  const getDailyAverageUsage = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats
      .filter((s) => s.month !== currentMonth)
      .slice(0, AVERAGE_MONTHS_LOOKBACK);
    if (previousMonths.length === 0) return 0;

    const totalUnits = previousMonths.reduce((sum, s) => sum + s.units, 0);

    const totalDays = previousMonths.reduce((sum, s) => {
      const [year = 0, month = 0] = s.month.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      return sum + daysInMonth;
    }, 0);

    return totalUnits / totalDays;
  }, [getMonthlyStats]);

  const getAverageMonthlyCost = useCallback(() => {
    const monthlyStats = getMonthlyStats();
    const currentMonth = getCurrentMonth();
    const previousMonths = monthlyStats
      .filter((s) => s.month !== currentMonth)
      .slice(0, AVERAGE_MONTHS_LOOKBACK);
    if (previousMonths.length === 0) return 0;
    return previousMonths.reduce((sum, s) => sum + s.cost, 0) / previousMonths.length;
  }, [getMonthlyStats]);

  const getRefillAnalysis = useCallback(() => {
    return calculateRefillIntervals(purchases);
  }, [purchases]);

  const currentMonthPurchases = getCurrentMonthPurchases();
  const unitsThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.units, 0);
  const costThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.amountPaid, 0);

  return {
    purchases,
    unitsThisMonth,
    costThisMonth,
    loading: purchasesData === undefined && confirmedPurchases.length === 0,
    addPurchase,
    addBatchPurchases,
    deletePurchase,
    getCurrentMonthPurchases,
    getMonthlyStats,
    getAverageMonthlyUsage,
    getDailyAverageUsage,
    getAverageMonthlyCost,
    getRefillAnalysis,
    offlineCount: offlineQueue.length,
  };
}
