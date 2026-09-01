import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap,
  TrendingUp,
  Calculator,
  History,
  Users,
  BarChart2,
  Download,
  Smartphone,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/electricity";
import { useAuth } from "@/hooks/useAuth";
import { useRates } from "@/hooks/useRates";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import type { ElectricityRate } from "@/hooks/useRates";

const primaryFeatures = [
  {
    icon: Zap,
    title: "Track Usage",
    description: "See exactly how many units you used each month and spot trends over time.",
  },
  {
    icon: Calculator,
    title: "Smart Calculator",
    description:
      "Enter any Rand amount and instantly see how many units you'll get at current Tshwane rates.",
  },
  {
    icon: Users,
    title: "Household Sharing",
    description: "Share your electricity account with family members — everyone can log purchases.",
  },
  {
    icon: BarChart2,
    title: "Usage Analytics",
    description: "View average daily consumption, multi-year trends, and refill frequency charts.",
  },
];

const secondaryFeatures = [
  { icon: TrendingUp, title: "Tiered pricing insights" },
  { icon: History, title: "Full purchase history" },
  { icon: Download, title: "Export to CSV" },
  { icon: Smartphone, title: "Installable on any device" },
];

const dotColors = ["bg-emerald-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
const valueColors = ["text-emerald-600", "text-yellow-600", "text-orange-500", "text-red-500"];

function FeaturesSection() {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-8">
      <h2 className="mb-5 text-center text-lg font-semibold">Everything you need</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {primaryFeatures.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-border/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xs font-semibold leading-tight">{feature.title}</h3>
            </div>
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {secondaryFeatures.map((feature) => (
          <span
            key={feature.title}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <feature.icon className="h-3.5 w-3.5 text-primary/70" />
            {feature.title}
          </span>
        ))}
      </div>
    </section>
  );
}

function RatesSection({
  rates,
  ratesLoading,
}: {
  rates: ElectricityRate[];
  ratesLoading: boolean;
}) {
  return (
    <section className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 text-center">
        <h2 className="text-base font-semibold">Live Tshwane Tariff Rates</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Updated each municipal tariff year</p>
      </div>
      {ratesLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rates.map((rate, index) => (
            <div
              key={rate._id}
              className="flex flex-col items-center rounded-xl border border-border/60 bg-card px-3 py-4 text-center ring-1 ring-border/40"
            >
              <span
                className={`mb-2 h-2 w-2 rounded-full ${dotColors[index % dotColors.length]}`}
              />
              <span className="text-xs font-semibold">{rate.tier_label}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {rate.min_units}–{rate.max_units === null ? "∞" : rate.max_units} units
              </span>
              <span className={`mt-2 text-sm font-bold ${valueColors[index % valueColors.length]}`}>
                {formatCurrency(rate.rate)}/kWh
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rates, loading: ratesLoading } = useRates();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Home"
        description="Calculate and track your prepaid electricity costs in Pretoria. Understand South Africa's tiered electricity pricing and track usage."
      />
      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Pretoria Prepaid",
          operatingSystem: "Web",
          applicationCategory: "UtilityApplication",
          description:
            "Track and calculate prepaid electricity usage and costs in Pretoria, South Africa.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "ZAR" },
          areaServed: { "@type": "City", name: "Pretoria" },
        })}
      </script>

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
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background px-4 pb-10 pt-12 text-center">
        <div className="relative mx-auto max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            100% Free — No subscription required
          </span>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            Track Your Prepaid
            <br />
            <span className="text-primary">Electricity</span>
          </h1>
          <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground">
            Understand South Africa's tiered electricity pricing, track your monthly usage, and make
            smarter purchasing decisions.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="rounded-full px-8 shadow-md"
          >
            Start tracking for free
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Always free · No ads · No subscription
          </p>
        </div>
      </section>

      {/* Audience callout */}
      <div className="border-y border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
        Built for Tshwane / Pretoria prepaid electricity customers
      </div>

      <FeaturesSection />
      <RatesSection rates={rates} ratesLoading={ratesLoading} />

      {/* Footer */}
      <footer className="mt-4 border-t border-border">
        <div className="container mx-auto flex flex-col items-center gap-1 px-4 py-5 text-center">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" />
            PowerTracker
          </div>
          <p className="text-xs text-muted-foreground">
            Free prepaid electricity tracker for Tshwane · No subscription required
          </p>
        </div>
      </footer>
    </div>
  );
}
