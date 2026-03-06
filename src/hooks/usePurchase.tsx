import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  Purchase,
  TierBreakdown,
  getCurrentMonth,
  calculateRefillIntervals,
} from "@/lib/electricity";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

const PURCHASES_CACHE_KEY = "purchases_history";
const QUEUE_CACHE_KEY = "offline_purchases_queue";

interface QueuedPurchase {
  id: string;
  type: "add" | "delete";
  units?: number;
  amountPaid?: number;
  date?: string;
  purchaseId?: string; // For deletions
  meterReading?: number | undefined;
}

export function usePurchases() {
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
        setConfirmedPurchases(JSON.parse(cachedPurchases));
      } catch (e) {
        console.error("Failed to parse cached purchases", e);
      }
    }

    const cachedQueue = localStorage.getItem(QUEUE_CACHE_KEY);
    if (cachedQueue) {
      try {
        setOfflineQueue(JSON.parse(cachedQueue));
      } catch (e) {
        console.error("Failed to parse offline queue", e);
      }
    }
  }, []);

  // Sync when coming online
  useEffect(() => {
    const syncQueue = async () => {
      if (offlineQueue.length === 0 || isSyncing.current || !navigator.onLine) return;

      isSyncing.current = true;
      const currentQueue = [...offlineQueue];

      toast.info(`Syncing ${currentQueue.length} offline actions...`);

      const remainingItems = [...currentQueue];
      for (const item of currentQueue) {
        if (!navigator.onLine) break;

        try {
          if (item.type === "add") {
            await addPurchaseMutation({
              date: item.date!,
              units: item.units!,
              cost: 0,
              amountPaid: item.amountPaid!,
              ...(item.meterReading !== undefined ? { meterReading: item.meterReading } : {}),
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

    window.addEventListener("online", syncQueue);
    if (navigator.onLine) syncQueue();

    return () => window.removeEventListener("online", syncQueue);
  }, [offlineQueue, addPurchaseMutation, deletePurchaseMutation]);

  // Update confirmed purchases when network data arrives
  useEffect(() => {
    if (purchasesData) {
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
    }
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
        date: item.date!,
        units: item.units!,
        cost: 0,
        amountPaid: item.amountPaid!,
        tierBreakdown: [],
        isOffline: true,
      }));

    const visibleConfirmed = confirmedPurchases.filter((p) => !deletedIds.has(p._id));

    return [...optimisticPurchases, ...visibleConfirmed];
  }, [confirmedPurchases, offlineQueue]);

  const addPurchase = useCallback(
    async (units: number, amountPaid: number, date: string, meterReading?: number) => {
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
          ...(meterReading !== undefined ? { meterReading } : {}),
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
