import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { getDaysLeftInMonth } from "@/lib/electricity";
import { PurchaseCalculator } from "@/components/PurchaseCalculator";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { LogOut, Zap } from "lucide-react";

export default function CalculatorPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    loading: purchasesLoading,
    getCurrentMonthPurchases,
    getAverageMonthlyUsage,
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSavePurchase = (units: number, amount: number) => {
    navigate("/history", { state: { prefillUnits: units, prefillAmount: amount } });
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
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <NavMenu />
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">PowerTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {user.primaryEmailAddress?.emailAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSignOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

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
