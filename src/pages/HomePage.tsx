import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, TrendingUp, Calculator, History, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/electricity";
import { useAuth } from "@/hooks/useAuth";
import { useRates } from "@/hooks/useRates";
import { useEffect } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rates, loading: ratesLoading } = useRates();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);
  const features = [
    {
      icon: Zap,
      title: "Track Usage",
      description: "Monitor your electricity consumption month by month",
    },
    {
      icon: TrendingUp,
      title: "Understand Tiers",
      description: "See how tiered pricing affects your electricity costs",
    },
    {
      icon: Calculator,
      title: "Smart Calculator",
      description: "Calculate costs before you buy based on your current usage",
    },
    {
      icon: History,
      title: "Purchase History",
      description: "Keep a complete record of all your electricity purchases",
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">PowerTracker</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h1 className="mb-3 text-2xl font-bold md:text-3xl">Track Your Prepaid Electricity</h1>
        <p className="mx-auto mb-6 max-w-lg text-sm text-muted-foreground">
          Understand South Africa's tiered electricity pricing, track your monthly usage, and make
          smarter purchasing decisions.
        </p>
        <Button onClick={() => navigate("/auth")} size="sm">
          Get Started
        </Button>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <CardContent className="pb-4 pt-4">
                <feature.icon className="mx-auto mb-2 h-8 w-8 text-primary" />
                <h3 className="mb-1 text-sm font-medium">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Current Rates Preview */}
      <section className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pb-4 pt-4">
            <h2 className="mb-3 text-center text-sm font-semibold">Current Electricity Rates</h2>
            {ratesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {rates.map((rate) => (
                  <div key={rate._id} className="rounded-md bg-primary-foreground p-2 text-center">
                    <p className="text-xs text-muted-foreground">{rate.tier_label}</p>
                    <p className="text-sm font-medium">{formatCurrency(rate.rate)}/kWh</p>
                    <p className="text-xs text-muted-foreground">
                      {rate.min_units}-{rate.max_units === null ? "∞" : rate.max_units} units
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-border">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          <p>PowerTracker - Track your prepaid electricity usage</p>
        </div>
      </footer>
    </div>
  );
}
