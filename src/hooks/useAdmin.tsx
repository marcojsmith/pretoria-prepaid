import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook for fetching administrative data and performing administrative actions.
 */
export function useAdmin() {
  const globalStats = useQuery(api.admin.getGlobalStats);
  const usersList = useQuery(api.admin.getUsersList);
  const recentPurchases = useQuery(api.admin.getRecentPurchases);
  const rates = useQuery(api.rates.getRates);
  const updateRateMutation = useMutation(api.rates.updateRate);

  const loading = !globalStats || !usersList || !recentPurchases || !rates;

  const updateRate = async (params: {
    id: any;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }) => {
    return await updateRateMutation(params);
  };

  return {
    loading,
    globalStats,
    usersList,
    recentPurchases,
    rates,
    updateRate,
  };
}
