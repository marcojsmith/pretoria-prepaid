export type QueuedPurchase =
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
