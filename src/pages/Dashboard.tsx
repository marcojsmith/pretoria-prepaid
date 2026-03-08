import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePurchases } from "@/hooks/usePurchase";
import { useRates } from "@/hooks/useRates";
import { useConsumption } from "@/hooks/useConsumption";
import { formatCurrency } from "@/lib/electricity";
import { DashboardStats } from "@/components/DashboardStats";
import { TierProgress } from "@/components/TierProgress";
import { MonthlyStats } from "@/components/MonthlyStats";
import { PurchaseFrequencyChart } from "@/components/PurchaseFrequencyChart";
import { YearlyConsumptionChart } from "@/components/YearlyConsumptionChart";
import { AverageDailyUsageChart } from "@/components/AverageDailyUsageChart";
import { PatreonBanner } from "@/components/PatreonBanner";
import { ConsumptionStatsCard } from "@/components/ConsumptionStatsCard";
import { Header } from "@/components/Header";
import { QuickActions } from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { rates, loading: ratesLoading } = useRates();
  const { stats: consumptionStats, loading: consumptionLoading } = useConsumption();
  const {
    loading: purchasesLoading,
    getCurrentMonthPurchases,
    getMonthlyStats,
    getAverageMonthlyUsage,
    getDailyAverageUsage,
    getAverageMonthlyCost,
    offlineCount,
  } = usePurchases();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const currentMonthPurchases = useMemo(
    () => getCurrentMonthPurchases(),
    [getCurrentMonthPurchases]
  );
  const unitsThisMonth = useMemo(
    () => currentMonthPurchases.reduce((sum, p) => sum + p.units, 0),
    [currentMonthPurchases]
  );
  const costThisMonth = useMemo(
    () => currentMonthPurchases.reduce((sum, p) => sum + p.amountPaid, 0),
    [currentMonthPurchases]
  );
  const monthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);
  const averageMonthlyUsage = useMemo(() => getAverageMonthlyUsage(), [getAverageMonthlyUsage]);
  const dailyAverage = useMemo(() => getDailyAverageUsage(), [getDailyAverageUsage]);
  const averageMonthlyCost = useMemo(() => getAverageMonthlyCost(), [getAverageMonthlyCost]);

  if (authLoading || purchasesLoading || profileLoading || consumptionLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="loading-spinner"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header offlineCount={offlineCount} />
      <PatreonBanner />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* KPI Section */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold tracking-tight">Overview</h1>
              <QuickActions />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ConsumptionStatsCard
                stats={consumptionStats}
                unitsThisMonth={unitsThisMonth}
                costThisMonth={costThisMonth}
              />
              <DashboardStats
                averageMonthlyUsage={averageMonthlyUsage}
                dailyAverage={dailyAverage}
                averageMonthlyCost={averageMonthlyCost}
              />
            </div>
          </section>

          {/* Tier and Monthly Stats */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TierProgress unitsBought={unitsThisMonth} />
            <MonthlyStats stats={monthlyStats} averageUsage={averageMonthlyUsage} />
          </section>

          {/* Charts Section */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {monthlyStats.length > 0 && (
              <div className="w-full">
                <YearlyConsumptionChart />
              </div>
            )}

            {monthlyStats.length > 0 && (
              <div className="w-full">
                <AverageDailyUsageChart />
              </div>
            )}

            {monthlyStats.length > 0 && (
              <div className="w-full">
                <PurchaseFrequencyChart stats={monthlyStats} />
              </div>
            )}
          </section>
        </div>

        <footer className="border-t border-border pt-4">
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Electricity Rates (VAT inclusive)
            </p>
            {ratesLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {rates.map((rate) => (
                  <div key={rate._id} className="text-[10px]">
                    <span className="text-muted-foreground">{rate.tier_label}:</span>{" "}
                    <span className="font-bold text-foreground">
                      {formatCurrency(rate.rate)}/kWh
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[10px] font-medium text-primary"
              onClick={() => navigate("/rates")}
            >
              View All Rates
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
