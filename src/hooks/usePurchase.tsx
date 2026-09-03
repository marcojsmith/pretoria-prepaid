import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { getCurrentMonth } from "@/lib/electricity";
import type { Purchase } from "@/lib/electricity";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { usePurchaseStats, type MonthlyStat } from "./usePurchaseStats";
import { usePurchaseAnalytics } from "./usePurchaseAnalytics";
import { useBatchImport } from "./useBatchImport";
import { useMeters } from "./useMeters";
import { useAuth } from "./useAuth";
import type { RefillInterval } from "@/lib/electricity";
import type { QueuedPurchase } from "@/types/purchases";

const PURCHASES_CACHE_KEY = "purchases_history";
const QUEUE_CACHE_KEY = "offline_purchases_queue";

/**
 * Builds the localStorage key for the confirmed-purchases cache, scoped to
 * the given active meter id. While `activeMeterId` is still loading, falls
 * back to a key scoped by `userId` (so two different accounts on the same
 * device/browser don't cross-read each other's cached data during the brief
 * loading window), and only falls all the way back to the bare
 * (un-suffixed) key if both are unresolved. This is a deliberate,
 * documented tradeoff for a single-tenant personal tracker, not a full
 * migration of legacy bare keys — see usePurchase.tsx findings.
 */
function getPurchasesCacheKey(
  activeMeterId: string | undefined,
  userId: string | undefined
): string {
  if (activeMeterId) return `${PURCHASES_CACHE_KEY}:${activeMeterId}`;
  if (userId) return `${PURCHASES_CACHE_KEY}:${userId}`;
  return PURCHASES_CACHE_KEY;
}

/**
 * Builds the localStorage key for the offline purchase queue, scoped to the
 * given active meter id. See {@link getPurchasesCacheKey}.
 */
function getQueueCacheKey(activeMeterId: string | undefined, userId: string | undefined): string {
  if (activeMeterId) return `${QUEUE_CACHE_KEY}:${activeMeterId}`;
  if (userId) return `${QUEUE_CACHE_KEY}:${userId}`;
  return QUEUE_CACHE_KEY;
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
  monthlyStats: MonthlyStat[];
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

function readCachedPurchases(cacheKey: string): Purchase[] {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return [];
  try {
    const parsed: unknown = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed.filter(isPurchase) : [];
  } catch (error) {
    console.error("Failed to parse cached purchases", error);
    return [];
  }
}

function readCachedQueue(cacheKey: string): QueuedPurchase[] {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return [];
  try {
    const parsed: unknown = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed.filter(isQueuedPurchase) : [];
  } catch (error) {
    console.error("Failed to parse offline queue", error);
    return [];
  }
}

/**
 * Hook to handle purchase caching in localStorage, scoped per active meter.
 * Re-reads from localStorage whenever the active meter changes, so switching
 * meters swaps in that meter's cached data instead of showing a flash of the
 * previously active meter's purchases.
 */
function usePurchaseCache(activeMeterId: string | undefined, userId: string | undefined) {
  const purchasesCacheKey = getPurchasesCacheKey(activeMeterId, userId);
  const queueCacheKey = getQueueCacheKey(activeMeterId, userId);

  const [confirmedPurchases, setConfirmedPurchases] = useState<Purchase[]>(() =>
    readCachedPurchases(purchasesCacheKey)
  );
  const [offlineQueue, setOfflineQueue] = useState<QueuedPurchase[]>(() =>
    readCachedQueue(queueCacheKey)
  );

  useEffect(() => {
    setConfirmedPurchases(readCachedPurchases(purchasesCacheKey));
    setOfflineQueue(readCachedQueue(queueCacheKey));
  }, [purchasesCacheKey, queueCacheKey]);

  const saveConfirmedPurchases = useCallback(
    (purchases: Purchase[]) => {
      setConfirmedPurchases(purchases);
      localStorage.setItem(purchasesCacheKey, JSON.stringify(purchases));
    },
    [purchasesCacheKey]
  );

  const saveOfflineQueue = useCallback(
    (queue: QueuedPurchase[]) => {
      setOfflineQueue(queue);
      localStorage.setItem(queueCacheKey, JSON.stringify(queue));
    },
    [queueCacheKey]
  );

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
  meterId?: Id<"meters">;
}) => Promise<unknown>;

type DeletePurchaseMutationFn = (args: {
  id: Id<"purchases">;
  meterId?: Id<"meters">;
}) => Promise<unknown>;

type PurchaseQueueContext = {
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
};

/**
 * Replays a single queued item against the meter captured at queue time,
 * not whatever happens to be active now — the user may have switched
 * meters while this item was sitting in the offline queue.
 */
async function replayQueuedItem(
  item: QueuedPurchase,
  mutations: {
    addPurchaseMutation: AddPurchaseMutationFn;
    deletePurchaseMutation: DeletePurchaseMutationFn;
  }
): Promise<void> {
  const { addPurchaseMutation, deletePurchaseMutation } = mutations;
  const meterId = item.meterId as Id<"meters"> | undefined;

  if (item.type === "add") {
    await addPurchaseMutation({
      date: item.date,
      units: item.units,
      cost: 0,
      amountPaid: item.amountPaid,
      meterReading: item.meterReading,
      ...(meterId ? { meterId } : {}),
    });
  } else if (item.type === "delete") {
    await deletePurchaseMutation({
      id: item.purchaseId as Id<"purchases">,
      ...(meterId ? { meterId } : {}),
    });
  }
}

/**
 * Hook to handle offline sync logic.
 *
 * `queueCacheKey` identifies which meter's queue this sync run is for. It's
 * captured at the start of `syncQueue` and compared, via a ref that's kept
 * fresh on every render (same pattern as `isSyncing`), against the CURRENT
 * key on each loop iteration. If the active meter changes mid-replay (the
 * user switches meters while a mutation is in flight), the stale closure
 * detects the mismatch and stops touching React state/localStorage for the
 * meter it started with — the un-replayed items are left untouched in that
 * meter's persisted queue and will be picked up on its next sync.
 */
function useOfflineSync({
  offlineQueue,
  saveOfflineQueue,
  addPurchaseMutation,
  deletePurchaseMutation,
  queueCacheKey,
}: {
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
  addPurchaseMutation: AddPurchaseMutationFn;
  deletePurchaseMutation: DeletePurchaseMutationFn;
  queueCacheKey: string;
}) {
  const isSyncing = useRef(false);
  const currentQueueCacheKeyRef = useRef(queueCacheKey);

  useEffect(() => {
    currentQueueCacheKeyRef.current = queueCacheKey;
  }, [queueCacheKey]);

  const syncQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || isSyncing.current || !navigator.onLine) return;

    const startedForKey = queueCacheKey;
    isSyncing.current = true;
    const currentQueue = [...offlineQueue];

    toast.info("Syncing offline actions...", {
      description: String(currentQueue.length) + " items",
    });

    const remainingItems = [...currentQueue];
    let abortedDueToMeterSwitch = false;
    for (const item of currentQueue) {
      if (!navigator.onLine) break;
      if (currentQueueCacheKeyRef.current !== startedForKey) {
        abortedDueToMeterSwitch = true;
        break;
      }

      try {
        await replayQueuedItem(item, { addPurchaseMutation, deletePurchaseMutation });
      } catch (error) {
        console.error("Failed to sync action", error);
        break;
      }

      if (currentQueueCacheKeyRef.current !== startedForKey) {
        abortedDueToMeterSwitch = true;
        break;
      }

      remainingItems.shift();
      saveOfflineQueue([...remainingItems]);
    }

    if (!abortedDueToMeterSwitch && remainingItems.length === 0) {
      toast.success("All offline actions synced successfully!");
    }
    isSyncing.current = false;
  }, [offlineQueue, addPurchaseMutation, deletePurchaseMutation, saveOfflineQueue, queueCacheKey]);

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

async function performAddPurchase(
  options: {
    units: number;
    amountPaid: number;
    date: string;
    meterReading: number;
    meterId: Id<"meters"> | undefined;
  },
  ctx: { mutation: AddPurchaseMutationFn } & PurchaseQueueContext
): Promise<void> {
  const { units, amountPaid, date, meterReading, meterId } = options;
  const { mutation, offlineQueue, saveOfflineQueue } = ctx;
  const queueItem: QueuedPurchase = {
    id: `offline-${Date.now()}`,
    type: "add",
    units,
    amountPaid,
    date,
    meterReading,
    ...(meterId ? { meterId } : {}),
  };
  if (!navigator.onLine) {
    saveOfflineQueue([...offlineQueue, queueItem]);
    toast.info("Purchase saved offline. Will sync when reconnected.");
    return;
  }
  try {
    await mutation({
      date,
      units,
      cost: 0,
      amountPaid,
      meterReading,
      ...(meterId ? { meterId } : {}),
    });
  } catch (error) {
    console.warn("Mutation failed, queuing instead", error);
    saveOfflineQueue([...offlineQueue, queueItem]);
    toast.info("Purchase saved offline. Will sync when reconnected.");
  }
}

async function performDeletePurchase(options: {
  id: string;
  meterId: Id<"meters"> | undefined;
  ctx: { mutation: DeletePurchaseMutationFn } & PurchaseQueueContext;
}): Promise<void> {
  const { id, meterId, ctx } = options;
  const { mutation, offlineQueue, saveOfflineQueue } = ctx;
  if (id.startsWith("offline-")) {
    saveOfflineQueue(offlineQueue.filter((item) => item.id !== id));
    return;
  }
  const deleteAction: QueuedPurchase = {
    id: `delete-${Date.now()}`,
    type: "delete",
    purchaseId: id,
    ...(meterId ? { meterId } : {}),
  };
  if (!navigator.onLine) {
    saveOfflineQueue([...offlineQueue, deleteAction]);
    toast.info("Delete action saved offline. Will sync when reconnected.");
    return;
  }
  try {
    await mutation({ id: id as Id<"purchases">, ...(meterId ? { meterId } : {}) });
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
  const purchasesData = useQuery(api.purchases.getPurchases, {});
  const addPurchaseMutation = useMutation(api.purchases.addPurchase);
  const deletePurchaseMutation = useMutation(api.purchases.deletePurchase);
  const { activeMeter } = useMeters();
  const activeMeterId = activeMeter?.meterId;
  const { user } = useAuth();
  const userId = user?.id;

  const { confirmedPurchases, offlineQueue, saveConfirmedPurchases, saveOfflineQueue } =
    usePurchaseCache(activeMeterId, userId);
  const queueCacheKey = getQueueCacheKey(activeMeterId, userId);

  useOfflineSync({
    offlineQueue,
    saveOfflineQueue,
    addPurchaseMutation,
    deletePurchaseMutation,
    queueCacheKey,
  });

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
      performAddPurchase(
        { ...options, meterId: activeMeterId },
        {
          mutation: addPurchaseMutation,
          offlineQueue,
          saveOfflineQueue,
        }
      ),
    [addPurchaseMutation, offlineQueue, saveOfflineQueue, activeMeterId]
  );

  const deletePurchase = useCallback(
    async (id: string) =>
      performDeletePurchase({
        id,
        meterId: activeMeterId,
        ctx: {
          mutation: deletePurchaseMutation,
          offlineQueue,
          saveOfflineQueue,
        },
      }),
    [deletePurchaseMutation, offlineQueue, saveOfflineQueue, activeMeterId]
  );

  const currentMonthPurchases = useMemo(() => {
    const currentMonth = getCurrentMonth();
    return purchases.filter((p) => p.date && p.date.startsWith(currentMonth));
  }, [purchases]);

  const unitsThisMonth = useMemo(
    () => currentMonthPurchases.reduce((sum, p) => sum + p.units, 0),
    [currentMonthPurchases]
  );

  const costThisMonth = useMemo(
    () => currentMonthPurchases.reduce((sum, p) => sum + p.amountPaid, 0),
    [currentMonthPurchases]
  );

  const getCurrentMonthPurchases = useCallback(
    () => currentMonthPurchases,
    [currentMonthPurchases]
  );

  const { getMonthlyStats, getAverageMonthlyUsage, getDailyAverageUsage, getAverageMonthlyCost } =
    usePurchaseStats(purchases);
  const { getRefillAnalysis } = usePurchaseAnalytics(purchases);
  const { addBatchPurchases } = useBatchImport({
    addPurchaseMutation,
    offlineQueue,
    saveOfflineQueue,
    ...(activeMeterId ? { activeMeterId } : {}),
  });

  const monthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

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
    monthlyStats,
  };
}
