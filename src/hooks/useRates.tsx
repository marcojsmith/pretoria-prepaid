import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";

export interface ElectricityRate {
  _id: string;
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

const RATES_CACHE_KEY = "electricity_rates";

export function useRates() {
  const ratesData = useQuery(api.rates.getRates);
  const updateRateMutation = useMutation(api.rates.updateRate);
  const [rates, setRates] = useState<ElectricityRate[]>([]);

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      try {
        setRates(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached rates", e);
      }
    }
  }, []);

  // Update cache and state when data changes
  useEffect(() => {
    if (ratesData) {
      const mappedRates: ElectricityRate[] = ratesData.map((r) => ({
        _id: r._id,
        tier_number: r.tier_number,
        tier_label: r.tier_label,
        min_units: r.min_units,
        max_units: r.max_units,
        rate: r.rate,
      }));
      setRates(mappedRates);
      localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(mappedRates));
    }
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
