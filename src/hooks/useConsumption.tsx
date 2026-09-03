import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { toast } from "sonner";
import { useMeters } from "./useMeters";

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
  correctBalance: (reading: number) => Promise<{ error: null } | { error: Error }>;
  hasAnyReadings: boolean;
  hasPurchaseReadings: boolean;
}

export function useConsumption(): UseConsumptionReturn {
  const readings = useQuery(api.readings.getReadings, {});
  const stats = useQuery(api.readings.getConsumptionStats, {}) as
    | ConsumptionStats
    | null
    | undefined;
  const hasAnyReadings = useQuery(api.readings.hasAnyReadings, {}) ?? false;
  const hasPurchaseReadings = useQuery(api.readings.hasPurchaseReadings, {}) ?? false;
  const addOnboardingReadingMutation = useMutation(api.readings.addOnboardingReading);
  const correctMeterReadingMutation = useMutation(api.readings.correctMeterReading);
  const { activeMeter } = useMeters();
  const activeMeterId = activeMeter?.meterId;

  const correctBalance = useCallback(
    async (reading: number) => {
      try {
        await correctMeterReadingMutation({
          reading,
          ...(activeMeterId ? { meterId: activeMeterId } : {}),
        });
        toast.success("Meter reading updated");
        return { error: null } as const;
      } catch (error) {
        console.error("Failed to correct meter reading:", error);
        toast.error("Failed to update meter reading");
        return { error: error as Error };
      }
    },
    [correctMeterReadingMutation, activeMeterId]
  );

  const addOnboardingReading = useCallback(
    async (reading: number, defaultDailyUsage?: number) => {
      try {
        const args: {
          reading: number;
          defaultDailyUsage?: number;
          meterId?: Id<"meters">;
        } = { reading };
        if (defaultDailyUsage !== undefined) {
          args.defaultDailyUsage = defaultDailyUsage;
        }
        if (activeMeterId !== undefined) {
          args.meterId = activeMeterId;
        }
        await addOnboardingReadingMutation(args);
        toast.success("Onboarding reading saved successfully");
      } catch (error) {
        console.error("Failed to add onboarding reading:", error);
        toast.error("Failed to save onboarding reading");
      }
    },
    [addOnboardingReadingMutation, activeMeterId]
  );

  return {
    readings,
    stats: stats ?? null,
    loading: readings === undefined || stats === undefined,
    addOnboardingReading,
    correctBalance,
    hasAnyReadings,
    hasPurchaseReadings,
  };
}
