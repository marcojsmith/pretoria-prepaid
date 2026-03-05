import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface ElectricityRate {
  _id: string;
  id: string;
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

export function useRates() {
  const ratesData = useQuery(api.rates.getRates);
  const updateRateMutation = useMutation(api.rates.updateRate);

  const rates: ElectricityRate[] = (ratesData ?? []).map((r) => ({
    _id: r._id,
    id: r._id,
    tier_number: r.tier_number,
    tier_label: r.tier_label,
    min_units: r.min_units,
    max_units: r.max_units,
    rate: r.rate,
  }));

  const updateRate = async (id: string, newRate: number) => {
    try {
      await updateRateMutation({ id: id as Id<"electricity_rates">, rate: newRate });
      return { error: null };
    } catch (error: any) {
      console.error("Error updating rate:", error);
      return { error };
    }
  };

  return {
    rates,
    loading: ratesData === undefined,
    updateRate,
    refetch: () => {}, // Convex handles automatic refetching
  };
}
