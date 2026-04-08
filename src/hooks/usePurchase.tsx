import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { getCurrentMonth, calculateRefillIntervals, type RefillInterval } from "@/lib/electricity";
import type { Purchase } from "@/lib/electricity";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DATE_MONTH_LENGTH, AVERAGE_MONTHS_LOOKBACK, MONTHS_IN_YEAR } from "@/lib/constants";

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

/**
 * Validates if an object is a Purchase.
 */
function isPurchase(p: unknown): p is Purchase {
  return (
    typeof p === "object" &&
    p !== null &&
    "_id" in p &&
    "date" in p &&
    "units" in p &&
    "amountPaid" in p
  );
}

/**
 * Validates if an object is a QueuedPurchase.
 */
function isQueuedPurchase(p: unknown): p is QueuedPurchase {
  if (typeof p !== "object" || p === null) return false;
  const item = p as Record<string, unknown>;
  if (item["type"] === "add") {
    return (
      typeof item["id"] === "string" &&
      typeof item["units"] === "number" &&
      typeof item["amountPaid"] === "number" &&
      typeof item["date"] === "string" &&
      typeof item["meterReading"] === "number"
    );
  }
  if (item["type"] === "delete") {
    return typeof item["id"] === "string" && typeof item["purchaseId"] === "string";
  }
  return false;
}

/**
 * Hook to handle purchase caching in localStorage.
 */
function usePurchaseCache() {
  const [confirmedPurchases, setConfirmedPurchases] = useState<Purchase[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedPurchase[]>([]);

  useEffect(() => {
    const cachedPurchases = localStorage.getItem(PURCHASES_CACHE_KEY);
    if (cachedPurchases) {
      try {
        const parsed: unknown = JSON.parse(cachedPurchases);
        if (Array.isArray(parsed)) {
          setConfirmedPurchases(parsed.filter(isPurchase));
        }
      } catch (error) {
        console.error("Failed to parse cached purchases", error);
      }
    }

    const cachedQueue = localStorage.getItem(QUEUE_CACHE_KEY);
    if (cachedQueue) {
      try {
        const parsed: unknown = JSON.parse(cachedQueue);
        if (Array.isArray(parsed)) {
          setOfflineQueue(parsed.filter(isQueuedPurchase));
        }
      } catch (error) {
        console.error("Failed to parse offline queue", error);
      }
    }
  }, []);

  const saveConfirmedPurchases = useCallback((purchases: Purchase[]) => {
    setConfirmedPurchases(purchases);
    localStorage.setItem(PURCHASES_CACHE_KEY, JSON.stringify(purchases));
  }, []);

  const saveOfflineQueue = useCallback((queue: QueuedPurchase[]) => {
    setOfflineQueue(queue);
    localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(queue));
  }, []);

  return {
    confirmedPurchases,
    offlineQueue,
    saveConfirmedPurchases,
    saveOfflineQueue,
  };
}

type AddPurchaseMutationFn = (args: {
  date: string;
  units: number;
  cost: number;
  amountPaid: number;
  meterReading: number;
}) => Promise<unknown>;

type DeletePurchaseMutationFn = (args: { id: Id<"purchases"> }) => Promise<unknown>;

type PurchaseQueueContext = {
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
};

/**
 * Hook to handle offline sync logic.
 */
function useOfflineSync({
  offlineQueue,
  saveOfflineQueue,
  addPurchaseMutation,
  deletePurchaseMutation,
}: {
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
  addPurchaseMutation: AddPurchaseMutationFn;
  deletePurchaseMutation: DeletePurchaseMutationFn;
}) {
  const isSyncing = useRef(false);

  const syncQueue = useCallback(async () => {
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
        saveOfflineQueue([...remainingItems]);
      } catch (error) {
        console.error("Failed to sync action", error);
        break;
      }
    }

    if (remainingItems.length === 0) {
      toast.success("All offline actions synced successfully!");
    }
    isSyncing.current = false;
  }, [offlineQueue, addPurchaseMutation, deletePurchaseMutation, saveOfflineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      void syncQueue();
    };
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) void syncQueue();

    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return { syncQueue };
}

/**
 * Calculates monthly statistics from purchases.
 */
function calculateMonthlyStats(purchases: Purchase[]): MonthlyStat[] {
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

async function performAddPurchase(
  options: { units: number; amountPaid: number; date: string; meterReading: number },
  ctx: { mutation: AddPurchaseMutationFn } & PurchaseQueueContext
): Promise<void> {
  const { units, amountPaid, date, meterReading } = options;
  const { mutation, offlineQueue, saveOfflineQueue } = ctx;
  const queueItem: QueuedPurchase = {
    id: `offline-${Date.now()}`,
    type: "add",
    units,
    amountPaid,
    date,
    meterReading,
  };
  if (!navigator.onLine) {
    saveOfflineQueue([...offlineQueue, queueItem]);
    toast.info("Purchase saved offline. Will sync when reconnected.");
    return;
  }
  try {
    await mutation({ date, units, cost: 0, amountPaid, meterReading });
  } catch (error) {
    console.warn("Mutation failed, queuing instead", error);
    saveOfflineQueue([...offlineQueue, queueItem]);
    toast.info("Purchase saved offline. Will sync when reconnected.");
  }
}

async function performBatchAdd(
  items: { units: number; amountPaid: number; date: string; meterReading: number }[],
  ctx: { mutation: AddPurchaseMutationFn } & PurchaseQueueContext
): Promise<void> {
  const { mutation, offlineQueue, saveOfflineQueue } = ctx;
  const newOfflineItems: QueuedPurchase[] = [];
  let successCount = 0;
  if (!navigator.onLine) {
    items.forEach((item, index) => {
      newOfflineItems.push({
        id: `offline-${Date.now()}-${index}`,
        type: "add",
        units: item.units,
        amountPaid: item.amountPaid,
        date: item.date,
        meterReading: item.meterReading,
      });
    });
    saveOfflineQueue([...offlineQueue, ...newOfflineItems]);
    toast.info("Purchases saved offline.", { description: String(items.length) + " purchases" });
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    try {
      await mutation({
        date: item.date,
        units: item.units,
        cost: 0,
        amountPaid: item.amountPaid,
        meterReading: item.meterReading,
      });
      successCount++;
    } catch (error) {
      console.warn("Batch item failed, queuing instead", error);
      newOfflineItems.push({
        id: `offline-${Date.now()}-${i}`,
        type: "add",
        units: item.units,
        amountPaid: item.amountPaid,
        date: item.date,
        meterReading: item.meterReading,
      });
    }
  }
  if (newOfflineItems.length > 0) {
    saveOfflineQueue([...offlineQueue, ...newOfflineItems]);
    toast.info("Imported purchases. Some items queued for retry.", {
      description:
        "Imported: " + String(successCount) + ", queued: " + String(newOfflineItems.length),
    });
  } else {
    toast.success(`Imported all ${successCount} purchases.`);
  }
}

async function performDeletePurchase(
  id: string,
  ctx: { mutation: DeletePurchaseMutationFn } & PurchaseQueueContext
): Promise<void> {
  const { mutation, offlineQueue, saveOfflineQueue } = ctx;
  if (id.startsWith("offline-")) {
    saveOfflineQueue(offlineQueue.filter((item) => item.id !== id));
    return;
  }
  const deleteAction: QueuedPurchase = {
    id: `delete-${Date.now()}`,
    type: "delete",
    purchaseId: id,
  };
  if (!navigator.onLine) {
    saveOfflineQueue([...offlineQueue, deleteAction]);
    toast.info("Delete action saved offline. Will sync when reconnected.");
    return;
  }
  try {
    await mutation({ id: id as Id<"purchases"> });
  } catch (error) {
    console.warn("Delete mutation failed, queuing instead", error);
    saveOfflineQueue([...offlineQueue, deleteAction]);
    toast.info("Delete action saved offline. Will sync when reconnected.");
  }
}

/**
 * Main hook for managing electricity purchases.
 * @returns An object containing purchases, stats, and actions.
 */
export function usePurchases(): UsePurchasesReturn {
  const purchasesData = useQuery(api.purchases.getPurchases);
  const addPurchaseMutation = useMutation(api.purchases.addPurchase);
  const deletePurchaseMutation = useMutation(api.purchases.deletePurchase);

  const { confirmedPurchases, offlineQueue, saveConfirmedPurchases, saveOfflineQueue } =
    usePurchaseCache();

  useOfflineSync({ offlineQueue, saveOfflineQueue, addPurchaseMutation, deletePurchaseMutation });

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
      tierBreakdown: p.tierBreakdown || [],
    }));
    saveConfirmedPurchases(mappedPurchases);
  }, [purchasesData, saveConfirmedPurchases]);

  // Combine confirmed and offline purchases for the UI
  const purchases = useMemo(() => {
    const deletedIds = new Set(
      offlineQueue.filter((item) => item.type === "delete").map((item) => item.purchaseId)
    );

    const optimisticPurchases: Purchase[] = offlineQueue
      .filter((item): item is Extract<QueuedPurchase, { type: "add" }> => item.type === "add")
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
    async (options: { units: number; amountPaid: number; date: string; meterReading: number }) =>
      performAddPurchase(options, {
        mutation: addPurchaseMutation,
        offlineQueue,
        saveOfflineQueue,
      }),
    [addPurchaseMutation, offlineQueue, saveOfflineQueue]
  );

  const addBatchPurchases = useCallback(
    async (items: { units: number; amountPaid: number; date: string; meterReading: number }[]) =>
      performBatchAdd(items, { mutation: addPurchaseMutation, offlineQueue, saveOfflineQueue }),
    [addPurchaseMutation, offlineQueue, saveOfflineQueue]
  );

  const deletePurchase = useCallback(
    async (id: string) =>
      performDeletePurchase(id, {
        mutation: deletePurchaseMutation,
        offlineQueue,
        saveOfflineQueue,
      }),
    [deletePurchaseMutation, offlineQueue, saveOfflineQueue]
  );

  const getCurrentMonthPurchases = useCallback(() => {
    const currentMonth = getCurrentMonth();
    return purchases.filter((p) => p.date && p.date.startsWith(currentMonth));
  }, [purchases]);

  const getMonthlyStats = useCallback(() => {
    return calculateMonthlyStats(purchases);
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
      const parts = s.month.split("-").map(Number);
      const year = parts[0];
      const month = parts[1];
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        month !== undefined &&
        month >= 1 &&
        month <= MONTHS_IN_YEAR
      ) {
        const daysInMonth = new Date(year!, month, 0).getDate();
        return sum + daysInMonth;
      }
      return sum;
    }, 0);

    return totalDays > 0 ? totalUnits / totalDays : 0;
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
