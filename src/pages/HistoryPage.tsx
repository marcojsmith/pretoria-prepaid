import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { useConsumption } from "@/hooks/useConsumption";
import { PurchaseHistory } from "@/components/PurchaseHistory";
import { ReadingHistory } from "@/components/ReadingHistory";
import { AddPurchaseForm } from "@/components/AddPurchaseForm";
import { AddReadingForm } from "@/components/AddReadingForm";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonthYearFilter } from "@/components/MonthYearFilter";
import { LogOut, Zap, Receipt, Activity, Filter, X } from "lucide-react";

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    loading: purchasesLoading,
    addPurchase,
    deletePurchase,
    purchases,
    getCurrentMonthPurchases,
    offlineCount,
  } = usePurchases();

  const { readings, addReading, deleteReading, loading: consumptionLoading } = useConsumption();

  const [activeTab, setActiveTab] = useState<"purchases" | "readings">("purchases");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

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

  // For AddPurchaseForm context
  const currentMonthPurchases = useMemo(
    () => getCurrentMonthPurchases(),
    [getCurrentMonthPurchases]
  );
  const unitsThisMonth = useMemo(
    () => currentMonthPurchases.reduce((sum, p) => sum + p.units, 0),
    [currentMonthPurchases]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    purchases.forEach((p) => {
      if (p.date) years.add(p.date.substring(0, 4));
    });
    readings?.forEach((r) => {
      if (r.date) years.add(r.date.substring(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [purchases, readings]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const monthMatch = selectedMonth === "All" || p.date.substring(5, 7) === selectedMonth;
      const yearMatch = selectedYear === "All" || p.date.substring(0, 4) === selectedYear;
      return monthMatch && yearMatch;
    });
  }, [purchases, selectedMonth, selectedYear]);

  const filteredReadings = useMemo(() => {
    if (!readings) return [];
    return readings.filter((r) => {
      const monthMatch = selectedMonth === "All" || r.date.substring(5, 7) === selectedMonth;
      const yearMatch = selectedYear === "All" || r.date.substring(0, 4) === selectedYear;
      return monthMatch && yearMatch;
    });
  }, [readings, selectedMonth, selectedYear]);

  const resetFilters = () => {
    setSelectedMonth("All");
    setSelectedYear("All");
  };

  const isFiltered = selectedMonth !== "All" || selectedYear !== "All";

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
          <div className="flex items-center justify-between gap-2">
            <div className="grid flex-1 grid-cols-2 gap-2">
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
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className={`h-4 w-4 ${isFiltered ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>

          {showFilters && (
            <Card className="bg-secondary/20">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider">Filters</h3>
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={resetFilters}
                    >
                      <X className="h-3 w-3" />
                      Reset
                    </Button>
                  )}
                </div>
                <MonthYearFilter
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  availableYears={availableYears}
                  onMonthChange={setSelectedMonth}
                  onYearChange={setSelectedYear}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "purchases" ? (
            <>
              <AddPurchaseForm
                unitsAlreadyBought={unitsThisMonth}
                onAdd={handleAddPurchase}
                prefillAmount={prefillData?.prefillAmount}
                prefillUnits={prefillData?.prefillUnits}
                prefillReading={prefillData?.prefillReading}
              />
              <PurchaseHistory purchases={filteredPurchases} onDelete={deletePurchase} />
            </>
          ) : (
            <>
              <AddReadingForm onAdd={addReading} />
              <ReadingHistory
                readings={filteredReadings}
                onDelete={deleteReading}
                isFiltered={isFiltered}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
