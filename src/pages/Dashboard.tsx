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
import { PatreonBanner } from "@/components/PatreonBanner";
import { ConsumptionStatsCard } from "@/components/ConsumptionStatsCard";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
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
    <div className="min-h-screen bg-background">
      <Header offlineCount={offlineCount} />

      <main className="container mx-auto space-y-3 px-4 py-3">
        <PatreonBanner />

        <ConsumptionStatsCard stats={consumptionStats} />

        <DashboardStats
          unitsThisMonth={unitsThisMonth}
          costThisMonth={costThisMonth}
          averageMonthlyUsage={averageMonthlyUsage}
          dailyAverage={dailyAverage}
          averageMonthlyCost={averageMonthlyCost}
          monthlyBudget={profile?.monthlyBudget}
        />

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1 lg:max-w-[600px]">
            <TierProgress unitsBought={unitsThisMonth} />
          </div>
          <div className="flex-1 lg:max-w-[600px]">
            <MonthlyStats stats={monthlyStats} averageUsage={averageMonthlyUsage} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:max-w-[1212px] lg:grid-cols-2">
          {monthlyStats.length > 0 && (
            <div className="w-full">
              <YearlyConsumptionChart />
            </div>
          )}

          {monthlyStats.length > 0 && (
            <div className="w-full">
              <PurchaseFrequencyChart stats={monthlyStats} />
            </div>
          )}
        </div>

        <footer className="border-t border-border pt-3">
          <div className="space-y-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Current Electricity Rates (VAT inclusive)
            </p>
            {ratesLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {rates.map((rate) => (
                  <div key={rate._id} className="text-[10px]">
                    <span className="text-muted-foreground">{rate.tier_label}:</span>{" "}
                    <span className="font-medium">{formatCurrency(rate.rate)}/kWh</span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[10px]"
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
