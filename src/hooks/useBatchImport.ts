import { useCallback } from "react";
import { toast } from "sonner";
import type { QueuedPurchase } from "@/types/purchases";
import type { Id } from "../../convex/_generated/dataModel";

type AddPurchaseMutationFn = (args: {
  date: string;
  units: number;
  cost: number;
  amountPaid: number;
  meterReading: number;
  meterId?: Id<"meters">;
}) => Promise<unknown>;

type BatchItem = { units: number; amountPaid: number; date: string; meterReading: number };

type BatchCtx = {
  mutation: AddPurchaseMutationFn;
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (q: QueuedPurchase[]) => void;
  meterId: Id<"meters"> | undefined;
};

function makeQueueItem(options: {
  item: BatchItem;
  index: number;
  meterId: Id<"meters"> | undefined;
}): QueuedPurchase {
  const { item, index, meterId } = options;
  return {
    id: `offline-${Date.now()}-${index}`,
    type: "add",
    units: item.units,
    amountPaid: item.amountPaid,
    date: item.date,
    meterReading: item.meterReading,
    ...(meterId ? { meterId } : {}),
  };
}

function queueAllOffline(
  items: BatchItem[],
  ctx: Pick<BatchCtx, "offlineQueue" | "saveOfflineQueue" | "meterId">
): void {
  const newItems = items.map((item, index) => makeQueueItem({ item, index, meterId: ctx.meterId }));
  ctx.saveOfflineQueue([...ctx.offlineQueue, ...newItems]);
  toast.info("Purchases saved offline.", { description: String(items.length) + " purchases" });
}

async function submitOnline(items: BatchItem[], ctx: BatchCtx): Promise<void> {
  const failed: QueuedPurchase[] = [];
  let successCount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    try {
      await ctx.mutation({
        date: item.date,
        units: item.units,
        cost: 0,
        amountPaid: item.amountPaid,
        meterReading: item.meterReading,
        ...(ctx.meterId ? { meterId: ctx.meterId } : {}),
      });
      successCount++;
    } catch (error) {
      console.warn("Batch item failed, queuing instead", error);
      failed.push(makeQueueItem({ item, index: i, meterId: ctx.meterId }));
    }
  }
  if (failed.length > 0) {
    ctx.saveOfflineQueue([...ctx.offlineQueue, ...failed]);
    toast.info("Imported purchases. Some items queued for retry.", {
      description: "Imported: " + String(successCount) + ", queued: " + String(failed.length),
    });
  } else {
    toast.success(`Imported all ${successCount} purchases.`);
  }
}

async function performBatchAdd(items: BatchItem[], ctx: BatchCtx): Promise<void> {
  if (!navigator.onLine) {
    queueAllOffline(items, ctx);
    return;
  }
  await submitOnline(items, ctx);
}

/**
 * Hook for batch importing electricity purchases.
 * @param addPurchaseMutation - The mutation function to add a single purchase.
 * @param offlineQueue - The current offline queue of pending purchases.
 * @param saveOfflineQueue - Function to save the offline queue.
 * @param activeMeterId - The caller's currently active meter id, captured
 * explicitly at call time rather than relying on the mutation's implicit
 * active-meter fallback.
 * @returns An object with addBatchPurchases function that calls performBatchAdd with the provided mutation and queue.
 */
export function useBatchImport({
  addPurchaseMutation,
  offlineQueue,
  saveOfflineQueue,
  activeMeterId,
}: {
  addPurchaseMutation: AddPurchaseMutationFn;
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
  activeMeterId?: Id<"meters">;
}): {
  addBatchPurchases: (items: BatchItem[]) => Promise<void>;
} {
  const addBatchPurchases = useCallback(
    async (items: BatchItem[]) =>
      performBatchAdd(items, {
        mutation: addPurchaseMutation,
        offlineQueue,
        saveOfflineQueue,
        meterId: activeMeterId,
      }),
    [addPurchaseMutation, offlineQueue, saveOfflineQueue, activeMeterId]
  );

  return { addBatchPurchases };
}
