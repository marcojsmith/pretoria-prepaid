import { useCallback } from "react";
import { toast } from "sonner";

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

type AddPurchaseMutationFn = (args: {
  date: string;
  units: number;
  cost: number;
  amountPaid: number;
  meterReading: number;
}) => Promise<unknown>;

type BatchItem = { units: number; amountPaid: number; date: string; meterReading: number };

type BatchCtx = {
  mutation: AddPurchaseMutationFn;
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (q: QueuedPurchase[]) => void;
};

function makeQueueItem(item: BatchItem, index: number): QueuedPurchase {
  return {
    id: `offline-${Date.now()}-${index}`,
    type: "add",
    units: item.units,
    amountPaid: item.amountPaid,
    date: item.date,
    meterReading: item.meterReading,
  };
}

function queueAllOffline(
  items: BatchItem[],
  ctx: Pick<BatchCtx, "offlineQueue" | "saveOfflineQueue">
): void {
  const newItems = items.map((item, i) => makeQueueItem(item, i));
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
      });
      successCount++;
    } catch (error) {
      console.warn("Batch item failed, queuing instead", error);
      failed.push(makeQueueItem(item, i));
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

export function useBatchImport({
  addPurchaseMutation,
  offlineQueue,
  saveOfflineQueue,
}: {
  addPurchaseMutation: AddPurchaseMutationFn;
  offlineQueue: QueuedPurchase[];
  saveOfflineQueue: (queue: QueuedPurchase[]) => void;
}): {
  addBatchPurchases: (items: BatchItem[]) => Promise<void>;
} {
  const addBatchPurchases = useCallback(
    async (items: BatchItem[]) =>
      performBatchAdd(items, { mutation: addPurchaseMutation, offlineQueue, saveOfflineQueue }),
    [addPurchaseMutation, offlineQueue, saveOfflineQueue]
  );

  return { addBatchPurchases };
}
