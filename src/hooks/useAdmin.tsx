import { useQuery, usePaginatedQuery, useMutation } from "convex/react";
import type { PaginationStatus, PaginatedQueryItem } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ElectricityRate, NewRatePeriodTier } from "./useRates";
import { USERS_LIST_PAGE_SIZE } from "../../convex/constants";

interface GlobalStats {
  totalUsers: number;
  totalUnits: number;
  totalCost: number;
  totalRevenue: number;
  avgUnitsPerUser: number | null;
  isPartial?: boolean;
  sampledProfilesCount?: number | undefined;
  sampledPurchasesCount?: number | undefined;
}

type UserWithRole = PaginatedQueryItem<typeof api.admin.getUsersList>;

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
  usersListStatus: PaginationStatus;
  loadMoreUsers: (numItems: number) => void;
  recentPurchases: RecentPurchase[] | undefined;
  rates: ElectricityRate[] | undefined;
  rateHistory: ElectricityRate[];
  updateRate: (params: {
    id: Id<"electricity_rates">;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }) => Promise<null>;
  addRatePeriod: (effectiveFrom: string, tiers: NewRatePeriodTier[]) => Promise<null>;
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
  const rateHistory = useQuery(api.rates.getRateHistory);
  const updateRateMutation = useMutation(api.rates.updateRate);
  const addRatePeriodMutation = useMutation(api.rates.addRatePeriod);

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

  const addRatePeriod = async (effectiveFrom: string, tiers: NewRatePeriodTier[]) => {
    return await addRatePeriodMutation({ effectiveFrom, rates: tiers });
  };

  return {
    loading,
    globalStats,
    usersList,
    usersListStatus,
    loadMoreUsers,
    recentPurchases,
    rates,
    rateHistory: rateHistory ?? [],
    updateRate,
    addRatePeriod,
  };
}
