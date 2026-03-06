import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { useConsumption } from "@/hooks/useConsumption";
import { PurchaseHistory } from "@/components/PurchaseHistory";
import { AddPurchaseForm } from "@/components/AddPurchaseForm";
import { AddReadingForm } from "@/components/AddReadingForm";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, Zap, Receipt, Activity, Trash2 } from "lucide-react";
import { roundUnits } from "@/lib/electricity";

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    loading: purchasesLoading,
    addPurchase,
    deletePurchase,
    getCurrentMonthPurchases,
    offlineCount,
  } = usePurchases();

  const { readings, addReading, deleteReading, loading: consumptionLoading } = useConsumption();

  const [activeTab, setActiveTab] = useState<"purchases" | "readings">("purchases");

  // Get prefill values from navigation state
  const prefillData = location.state as {
    prefillUnits?: number;
    prefillAmount?: number;
    prefillReading?: number;
    showReadings?: boolean;
  } | null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (prefillData?.showReadings) {
      setActiveTab("readings");
    }
  }, [prefillData]);

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

  const handleAddPurchase = async (
    units: number,
    amountPaid: number,
    date: string,
    meterReading?: number
  ) => {
    await addPurchase(units, amountPaid, date, meterReading);
    if (prefillData) {
      navigate("/history", { replace: true, state: null });
    }
  };

  if (authLoading || purchasesLoading || consumptionLoading) {
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
            <NavMenu offlineCount={offlineCount} />
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === "purchases" ? "default" : "outline"}
              size="sm"
              className="h-9 gap-2"
              onClick={() => setActiveTab("purchases")}
            >
              <Receipt className="h-4 w-4" />
              Purchases
            </Button>
            <Button
              variant={activeTab === "readings" ? "default" : "outline"}
              size="sm"
              className="h-9 gap-2"
              onClick={() => setActiveTab("readings")}
            >
              <Activity className="h-4 w-4" />
              Readings
            </Button>
          </div>

          {activeTab === "purchases" ? (
            <>
              <AddPurchaseForm
                unitsAlreadyBought={unitsThisMonth}
                onAdd={handleAddPurchase}
                prefillAmount={prefillData?.prefillAmount}
                prefillUnits={prefillData?.prefillUnits}
                prefillReading={prefillData?.prefillReading}
              />
              <PurchaseHistory purchases={currentMonthPurchases} onDelete={deletePurchase} />
            </>
          ) : (
            <>
              <AddReadingForm onAdd={addReading} />
              <div className="space-y-3">
                <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Reading History
                </h3>
                {readings && readings.length > 0 ? (
                  <div className="space-y-2">
                    {readings.map((reading) => (
                      <Card key={reading._id} className="overflow-hidden">
                        <CardContent className="flex items-center justify-between p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold">{roundUnits(reading.reading)} kWh</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(reading.date).toLocaleDateString("en-ZA", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteReading(reading._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Activity className="mb-2 h-8 w-8 opacity-20" />
                      <p className="text-xs">No readings logged yet.</p>
                      <p className="text-[10px]">
                        Log your first meter reading to start tracking usage.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
