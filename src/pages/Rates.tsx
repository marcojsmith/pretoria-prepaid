import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRateHistory } from "@/hooks/useRates";
import { usePurchases } from "@/hooks/usePurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateHistoryTable } from "@/components/RateHistoryTable";
import { Header } from "@/components/Header";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Rates(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { history, loading: historyLoading } = useRateHistory();
  const { offlineCount } = usePurchases();

  if (authLoading || historyLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="loading-spinner"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Electricity Rates"
        description="View current prepaid electricity rates and pricing tiers for Pretoria and South Africa (VAT inclusive)."
        noindex
      />
      <Header offlineCount={offlineCount} />
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-[760px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Electricity Rates</CardTitle>
              <p className="text-xs text-muted-foreground">
                South African prepaid electricity pricing tiers (VAT inclusive) by tariff period,
                with the change from the previous period.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <RateHistoryTable history={history} />
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Contact an administrator to request rate changes.
          </p>
        </div>
      </main>
    </div>
  );
}
