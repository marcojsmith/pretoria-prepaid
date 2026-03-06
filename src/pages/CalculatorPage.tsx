import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { getDaysLeftInMonth } from "@/lib/electricity";
import { PurchaseCalculator } from "@/components/PurchaseCalculator";
import { Header } from "@/components/Header";

export default function CalculatorPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    loading: purchasesLoading,
    getCurrentMonthPurchases,
    getAverageMonthlyUsage,
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
  const averageMonthlyUsage = useMemo(() => getAverageMonthlyUsage(), [getAverageMonthlyUsage]);

  const handleSavePurchase = (units: number, amount: number, currentBalance?: number) => {
    navigate("/history", {
      state: {
        prefillUnits: units,
        prefillAmount: amount,
        prefillReading: currentBalance,
      },
    });
  };

  if (authLoading || purchasesLoading) {
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
      <Header offlineCount={offlineCount} />

      <main className="container mx-auto px-4 py-4">
        <div className="mx-auto max-w-[600px]">
          <PurchaseCalculator
            unitsAlreadyBought={unitsThisMonth}
            averageMonthlyUsage={averageMonthlyUsage}
            daysLeftInMonth={daysLeft}
            onSavePurchase={handleSavePurchase}
          />
        </div>
      </main>
    </div>
  );
}
