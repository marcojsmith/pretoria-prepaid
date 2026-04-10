import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePurchases } from "@/hooks/usePurchase";
import { useRates } from "@/hooks/useRates";
import { useConsumption } from "@/hooks/useConsumption";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import type { CardConfig } from "@/hooks/useDashboardLayout";
import { formatCurrency } from "@/lib/electricity";
import { PatreonBanner } from "@/components/PatreonBanner";
import { Header } from "@/components/Header";
import { QuickActions } from "@/components/QuickActions";
import { DashboardGrid } from "@/components/DashboardGrid";
import { DashboardLayoutEditor } from "@/components/DashboardLayoutEditor";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Pencil } from "lucide-react";
import { SEO } from "@/components/SEO";
import { OnboardingForm } from "@/components/OnboardingForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function DashboardLoading(): JSX.Element {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      data-testid="loading-spinner"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

interface DashboardHeaderProps {
  onEditLayout: () => void;
}

function DashboardHeader({ onEditLayout }: DashboardHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Your Usage</h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEditLayout}
          aria-label="Edit dashboard layout"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <QuickActions />
    </div>
  );
}

function FirstPurchasePrompt(): JSX.Element {
  const navigate = useNavigate();
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-primary" />
          Log your first purchase
        </CardTitle>
        <CardDescription className="text-xs">
          Your estimated balance is based on your onboarding reading. Log your first electricity
          purchase to get accurate usage tracking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs"
          onClick={() => navigate("/history")}
        >
          Go to History
        </Button>
      </CardContent>
    </Card>
  );
}

interface LayoutEditorWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardConfig[];
  onCardsChange: (cards: CardConfig[]) => void;
  onToggleVisibility: (id: CardConfig["id"]) => void;
  onReset: () => void;
}

function LayoutEditorWrapper(props: LayoutEditorWrapperProps): JSX.Element {
  return <DashboardLayoutEditor {...props} />;
}

function RatesFooter(): JSX.Element {
  const navigate = useNavigate();
  const { rates, loading: ratesLoading } = useRates();
  const vat_label = "Current Electricity Rates (VAT inclusive)";

  return (
    <footer className="border-t border-border pt-4">
      <div className="space-y-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {vat_label}
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
                <span className="font-bold text-foreground">{formatCurrency(rate.rate)}/kWh</span>
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
        <p className="text-[10px] text-muted-foreground">v{__APP_VERSION__}</p>
      </div>
    </footer>
  );
}

export default function Dashboard(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const {
    stats: consumptionStats,
    loading: consumptionLoading,
    addOnboardingReading,
    hasAnyReadings,
    hasPurchaseReadings,
  } = useConsumption();
  const {
    loading: purchasesLoading,
    getCurrentMonthPurchases,
    getMonthlyStats,
    getAverageMonthlyUsage,
    getAverageMonthlyCost,
    offlineCount,
  } = usePurchases();
  const { cards, setCards, toggleVisibility, resetLayout } = useDashboardLayout();
  const [editorOpen, setEditorOpen] = useState(false);

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
  const averageMonthlyCost = useMemo(() => getAverageMonthlyCost(), [getAverageMonthlyCost]);

  const isLoading = authLoading || purchasesLoading || profileLoading || consumptionLoading;

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!user) {
    return null;
  }

  const seo = (
    <SEO
      title="Dashboard"
      description="View your personal prepaid electricity usage, costs, and consumption trends at a glance."
      noindex
    />
  );

  if (!hasAnyReadings) {
    return (
      <div className="min-h-screen bg-background pb-6">
        {seo}
        <Header offlineCount={offlineCount} />
        <PatreonBanner />
        <main className="container mx-auto space-y-6 px-4 py-6">
          <OnboardingForm
            onSubmit={(reading, defaultDailyUsage) => {
              void addOnboardingReading(reading, defaultDailyUsage);
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {seo}
      <Header offlineCount={offlineCount} />
      <PatreonBanner />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <DashboardHeader onEditLayout={() => setEditorOpen(true)} />

        {!hasPurchaseReadings && <FirstPurchasePrompt />}

        <DashboardGrid
          cards={cards}
          consumptionStats={consumptionStats}
          unitsThisMonth={unitsThisMonth}
          costThisMonth={costThisMonth}
          averageMonthlyUsage={averageMonthlyUsage}
          averageMonthlyCost={averageMonthlyCost}
          monthlyStats={monthlyStats}
        />

        <RatesFooter />
      </main>

      <LayoutEditorWrapper
        open={editorOpen}
        onOpenChange={setEditorOpen}
        cards={cards}
        onCardsChange={setCards}
        onToggleVisibility={toggleVisibility}
        onReset={resetLayout}
      />
    </div>
  );
}
