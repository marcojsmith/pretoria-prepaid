import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { useConsumption } from "@/hooks/useConsumption";
import { getDaysLeftInMonth } from "@/lib/electricity";
import { PurchaseCalculator } from "@/components/PurchaseCalculator";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";

export default function CalculatorPage(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    loading: purchasesLoading,
    getCurrentMonthPurchases,
    getAverageMonthlyUsage,
    offlineCount,
  } = usePurchases();
  const { stats, loading: consumptionLoading } = useConsumption();

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
  const averageMonthlyUsage = useMemo(() => getAverageMonthlyUsage(), [getAverageMonthlyUsage]);

  const handleSavePurchase = (options: {
    units: number;
    amount: number;
    currentBalance?: number;
  }) => {
    const { units, amount, currentBalance } = options;
    navigate("/history", {
      state: {
        prefillUnits: units,
        prefillAmount: amount,
        prefillReading: currentBalance,
      },
    });
  };

  if (authLoading || purchasesLoading || consumptionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const daysLeft = getDaysLeftInMonth();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Calculator"
        description="Calculate how many electricity units you'll receive for your Rand amount based on current Pretoria prepaid tiers."
        noindex
      />
      <Header offlineCount={offlineCount} />
      <main className="container mx-auto px-4 py-4">
        <div className="mx-auto max-w-[600px]">
          <PurchaseCalculator
            unitsAlreadyBought={unitsThisMonth}
            averageMonthlyUsage={averageMonthlyUsage}
            daysLeftInMonth={daysLeft}
            onSavePurchase={handleSavePurchase}
            dailyBurnRate={stats?.dailyBurnRate ?? 0}
            estimatedBalance={stats?.estimatedBalance ?? 0}
          />
        </div>
      </main>
    </div>
  );
}
