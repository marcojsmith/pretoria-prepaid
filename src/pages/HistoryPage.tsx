import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { PurchaseHistory } from "@/components/PurchaseHistory";
import { AddPurchaseForm } from "@/components/AddPurchaseForm";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { LogOut, Zap } from "lucide-react";

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    loading: purchasesLoading,
    addPurchase,
    deletePurchase,
    getCurrentMonthPurchases,
  } = usePurchases();

  // Get prefill values from navigation state
  const prefillData = location.state as { prefillUnits?: number; prefillAmount?: number } | null;

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleAddPurchase = async (units: number, amountPaid: number, date: string) => {
    await addPurchase(units, amountPaid, date);
    // Clear the prefill state after successful add
    if (prefillData) {
      navigate("/history", { replace: true, state: null });
    }
  };

  if (authLoading || purchasesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

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

      <main className="container mx-auto space-y-4 px-4 py-4">
        <div className="mx-auto max-w-[600px] space-y-4">
          <AddPurchaseForm
            unitsAlreadyBought={unitsThisMonth}
            onAdd={handleAddPurchase as any}
            prefillAmount={prefillData?.prefillAmount as any}
            prefillUnits={prefillData?.prefillUnits as any}
          />

          <PurchaseHistory purchases={currentMonthPurchases} onDelete={deletePurchase} />
        </div>
      </main>
    </div>
  );
}
