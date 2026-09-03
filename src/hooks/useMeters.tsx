import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

/**
 * A meter as returned by `api.meters.listMyMeters`, scoped to the caller's
 * household memberships.
 */
export interface ListedMeter {
  meterId: Id<"meters">;
  householdId: Id<"households">;
  householdName: string;
  name: string;
  meterNumber?: string;
  lowBalanceThreshold?: number;
  defaultDailyUsage?: number;
  isActive: boolean;
  myRole: "admin" | "member";
}

/**
 * Return type for the useMeters hook: the caller's meter list, their
 * currently active meter, and CRUD mutations for household admins.
 */
export interface UseMetersReturn {
  /** All non-archived meters visible to the caller, across all household memberships. */
  meters: ListedMeter[] | undefined;
  /** The meter currently marked active for the caller, if any. */
  activeMeter: ListedMeter | undefined;
  /** Whether the meter list is still loading. */
  loading: boolean;
  /** Marks the given meter as the caller's active meter. */
  setActiveMeter: (meterId: Id<"meters">) => Promise<void>;
  /** Creates a new meter under the given household (admin only). */
  addMeter: (args: {
    householdId: Id<"households">;
    name: string;
    meterNumber?: string;
  }) => Promise<Id<"meters">>;
  /** Updates a meter's name, meter number, or thresholds (admin only). */
  updateMeter: (args: {
    meterId: Id<"meters">;
    name?: string;
    meterNumber?: string;
    lowBalanceThreshold?: number;
    defaultDailyUsage?: number;
  }) => Promise<void>;
  /** Archives a meter, removing it from active use (admin only). */
  archiveMeter: (meterId: Id<"meters">) => Promise<void>;
}

/**
 * Hook exposing the caller's meters, their active meter, and meter CRUD
 * mutations. Thin wrapper over `api.meters.*`, matching the toast-on-result
 * conventions used by `useHousehold`/`HouseholdPage`.
 */
export function useMeters(): UseMetersReturn {
  const meters = useQuery(api.meters.listMyMeters, {});
  const setActiveMeterMutation = useMutation(api.meters.setActiveMeter);
  const addMeterMutation = useMutation(api.meters.addMeter);
  const updateMeterMutation = useMutation(api.meters.updateMeter);
  const archiveMeterMutation = useMutation(api.meters.archiveMeter);

  const setActiveMeter = async (meterId: Id<"meters">): Promise<void> => {
    try {
      await setActiveMeterMutation({ meterId });
      toast.success("Active meter switched");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch meter");
      throw error;
    }
  };

  const addMeter = async (args: {
    householdId: Id<"households">;
    name: string;
    meterNumber?: string;
  }): Promise<Id<"meters">> => {
    try {
      const meterId = await addMeterMutation(args);
      toast.success("Meter added");
      return meterId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add meter");
      throw error;
    }
  };

  const updateMeter = async (args: {
    meterId: Id<"meters">;
    name?: string;
    meterNumber?: string;
    lowBalanceThreshold?: number;
    defaultDailyUsage?: number;
  }): Promise<void> => {
    try {
      await updateMeterMutation(args);
      toast.success("Meter updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update meter");
      throw error;
    }
  };

  const archiveMeter = async (meterId: Id<"meters">): Promise<void> => {
    try {
      await archiveMeterMutation({ meterId });
      toast.success("Meter archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive meter");
      throw error;
    }
  };

  return {
    meters,
    activeMeter: meters?.find((m) => m.isActive),
    loading: meters === undefined,
    setActiveMeter,
    addMeter,
    updateMeter,
    archiveMeter,
  };
}
