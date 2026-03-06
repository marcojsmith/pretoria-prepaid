import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export interface ConsumptionStats {
  lastReading: number;
  lastReadingDate: string;
  dailyBurnRate: number;
  estimatedBalance: number;
  daysRemaining: number;
  daysRemainingUntilLow: number;
  lowBalanceThreshold: number;
  isEstimatedBurnRate: boolean;
}

export function useConsumption() {
  const readings = useQuery(api.readings.getReadings);
  const stats = useQuery(api.readings.getConsumptionStats) as ConsumptionStats | null | undefined;
  const addReadingMutation = useMutation(api.readings.addReading);
  const deleteReadingMutation = useMutation(api.readings.deleteReading);

  const addReading = useCallback(
    async (reading: number, date: string) => {
      try {
        await addReadingMutation({ reading, date });
        toast.success("Reading logged successfully");
      } catch (error) {
        console.error("Failed to add reading:", error);
        toast.error("Failed to log reading");
      }
    },
    [addReadingMutation]
  );

  const deleteReading = useCallback(
    async (id: Id<"meter_readings">) => {
      try {
        await deleteReadingMutation({ id });
        toast.success("Reading deleted");
      } catch (error) {
        console.error("Failed to delete reading:", error);
        toast.error("Failed to delete reading");
      }
    },
    [deleteReadingMutation]
  );

  return {
    readings,
    stats: stats ?? null,
    loading: readings === undefined || stats === undefined,
    addReading,
    deleteReading,
  };
}
