import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";

export interface ElectricityRate {
  _id: Id<"electricity_rates">;
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
  effectiveFrom?: string;
}

export interface NewRatePeriodTier {
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

export interface UseRatesReturn {
  rates: ElectricityRate[];
  loading: boolean;
  updateRate: (id: string, newRate: number) => Promise<{ error: null } | { error: Error }>;
  refetch: () => void;
}

const RATES_CACHE_KEY = "electricity_rates";

export function useRates(): UseRatesReturn {
  const ratesData = useQuery(api.rates.getRates);
  const updateRateMutation = useMutation(api.rates.updateRate);
  const [rates, setRates] = useState<ElectricityRate[]>([]);

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      try {
        setRates(JSON.parse(cached) as ElectricityRate[]);
      } catch (error) {
        console.error("Failed to parse cached rates", error);
      }
    }
  }, []);

  // Update cache and state when data changes
  useEffect(() => {
    if (!ratesData) {
      return;
    }

    const mappedRates: ElectricityRate[] = ratesData.map((r) => ({
      _id: r._id,
      tier_number: r.tier_number,
      tier_label: r.tier_label,
      min_units: r.min_units,
      max_units: r.max_units,
      rate: r.rate,
      ...(r.effectiveFrom !== undefined ? { effectiveFrom: r.effectiveFrom } : {}),
    }));
    setRates(mappedRates);
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(mappedRates));
  }, [ratesData]);

  const updateRate = async (id: string, newRate: number) => {
    try {
      await updateRateMutation({ id: id as Id<"electricity_rates">, rate: newRate });
      return { error: null };
    } catch (error) {
      console.error("Error updating rate:", error);
      return { error: error as Error };
    }
  };

  return {
    rates,
    loading: ratesData === undefined && rates.length === 0,
    updateRate,
    refetch: () => {}, // Convex handles automatic refetching
  };
}

export interface UseRateHistoryReturn {
  history: ElectricityRate[];
  loading: boolean;
}

/** Every rate period ever loaded, newest effectiveFrom first. */
export function useRateHistory(): UseRateHistoryReturn {
  const historyData = useQuery(api.rates.getRateHistory);

  return {
    history: historyData ?? [],
    loading: historyData === undefined,
  };
}
