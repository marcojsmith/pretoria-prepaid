export type QueuedPurchase =
  | {
      id: string;
      type: "add";
      units: number;
      amountPaid: number;
      date: string;
      meterReading: number;
      /**
       * The active meter id captured at the moment this action was queued.
       * Optional so items queued before this field existed still round-trip
       * through `isQueuedPurchase`; `undefined` means "resolve against
       * whatever meter is active at sync time" (the pre-fix behaviour).
       */
      meterId?: string;
    }
  | {
      id: string;
      type: "delete";
      purchaseId: string;
      meterId?: string;
    };
