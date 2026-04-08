import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
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

export interface Reading extends Doc<"meter_readings"> {}

export interface UseConsumptionReturn {
  readings: Reading[] | undefined;
  stats: ConsumptionStats | null;
  loading: boolean;
  addOnboardingReading: (reading: number, defaultDailyUsage?: number) => Promise<void>;
  hasAnyReadings: boolean;
  hasPurchaseReadings: boolean;
}

export function useConsumption(): UseConsumptionReturn {
  const readings = useQuery(api.readings.getReadings);
  const stats = useQuery(api.readings.getConsumptionStats) as ConsumptionStats | null | undefined;
  const hasAnyReadings = useQuery(api.readings.hasAnyReadings) ?? false;
  const hasPurchaseReadings = useQuery(api.readings.hasPurchaseReadings) ?? false;
  const addOnboardingReadingMutation = useMutation(api.readings.addOnboardingReading);

  const addOnboardingReading = useCallback(
    async (reading: number, defaultDailyUsage?: number) => {
      try {
        const args: { reading: number; defaultDailyUsage?: number } = { reading };
        if (defaultDailyUsage !== undefined) {
          args.defaultDailyUsage = defaultDailyUsage;
        }
        await addOnboardingReadingMutation(args);
        toast.success("Onboarding reading saved successfully");
      } catch (error) {
        console.error("Failed to add onboarding reading:", error);
        toast.error("Failed to save onboarding reading");
      }
    },
    [addOnboardingReadingMutation]
  );

  return {
    readings,
    stats: stats ?? null,
    loading: readings === undefined || stats === undefined,
    addOnboardingReading,
    hasAnyReadings,
    hasPurchaseReadings,
  };
}
