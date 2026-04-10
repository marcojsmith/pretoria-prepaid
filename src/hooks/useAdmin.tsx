import { useQuery, usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Doc } from "../../convex/_generated/dataModel";
import type { ElectricityRate } from "./useRates";
import { USERS_LIST_PAGE_SIZE } from "../../convex/constants";

interface GlobalStats {
  totalUsers: number;
  totalUnits: number;
  totalCost: number;
  totalRevenue: number;
  avgUnitsPerUser: number;
}

interface UserWithRole extends Doc<"profiles"> {
  role: string;
}

interface RecentPurchase {
  _id: string;
  userId: string;
  date: string;
  units: number;
  cost: number;
  amountPaid: number;
  tierBreakdown: unknown[];
  userName: string | null;
  readingPre: number | null;
  readingPost: number | null;
  effectiveRate: number | null;
}

export interface UseAdminReturn {
  loading: boolean;
  globalStats: GlobalStats | undefined;
  usersList: UserWithRole[];
  usersListStatus: string;
  loadMoreUsers: (numItems: number) => void;
  recentPurchases: RecentPurchase[] | undefined;
  rates: ElectricityRate[] | undefined;
  updateRate: (params: {
    id: Id<"electricity_rates">;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }) => Promise<null>;
}

/**
 * Hook for fetching administrative data and performing administrative actions.
 */
export function useAdmin(): UseAdminReturn {
  const globalStats = useQuery(api.admin.getGlobalStats);
  const {
    results: usersList,
    status: usersListStatus,
    loadMore: loadMoreUsers,
  } = usePaginatedQuery(api.admin.getUsersList, {}, { initialNumItems: USERS_LIST_PAGE_SIZE });
  const recentPurchases = useQuery(api.admin.getRecentPurchases);
  const rates = useQuery(api.rates.getRates);
  const updateRateMutation = useMutation(api.rates.updateRate);

  const loading =
    !globalStats || usersListStatus === "LoadingFirstPage" || !recentPurchases || !rates;

  const updateRate = async (params: {
    id: Id<"electricity_rates">;
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
    usersList: usersList as UserWithRole[],
    usersListStatus,
    loadMoreUsers,
    recentPurchases,
    rates,
    updateRate,
  };
}
