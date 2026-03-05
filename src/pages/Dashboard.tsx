import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePurchases } from "@/hooks/usePurchase";
import { useRates } from "@/hooks/useRates";
import { formatCurrency } from "@/lib/electricity";
import { DashboardStats } from "@/components/DashboardStats";
import { TierProgress } from "@/components/TierProgress";
import { MonthlyStats } from "@/components/MonthlyStats";
import { PatreonBanner } from "@/components/PatreonBanner";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { LogOut, Zap, Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { rates, loading: ratesLoading } = useRates();
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading || purchasesLoading || profileLoading) {
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
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <NavMenu offlineCount={offlineCount} />
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">PowerTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {profile?.preferredName || user.primaryEmailAddress?.emailAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSignOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-3 px-4 py-3">
        <PatreonBanner />

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
