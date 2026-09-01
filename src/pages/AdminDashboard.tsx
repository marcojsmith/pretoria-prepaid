import { useAdmin } from "@/hooks/useAdmin";
import { InfoTip } from "@/components/InfoTip";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/electricity";
import {
  Loader2,
  Users,
  Receipt,
  TrendingUp,
  ShieldCheck,
  Edit2,
  Check,
  X,
  ArrowRight,
  CalendarPlus,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  MS_PER_DAY,
  DEFAULT_BURN_RATE,
  MAX_TIER_PERCENTAGE,
  USER_ID_PREVIEW_LENGTH,
} from "@/lib/constants";
import { USERS_LIST_PAGE_SIZE } from "../../convex/constants";
import { RATE_MIN, RATE_MAX, RATE_INVALID_MESSAGE } from "../../convex/rates";
import type { ElectricityRate, NewRatePeriodTier } from "@/hooks/useRates";
import { RateHistoryTable, BASELINE_EFFECTIVE_FROM } from "@/components/RateHistoryTable";

const BURN_RATE_TABLE_COLS = 5;

// ---------------------------------------------------------------------------
// KPI Breakdown sub-component — loads per-user data and explains each KPI
// ---------------------------------------------------------------------------

// eslint-disable-next-line llm-core/max-function-length
function KPIBreakdown({ userId, userName }: { userId: string; userName: string }) {
  const kpiData = useQuery(api.admin.getUserKPIData, { userId });

  if (kpiData === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const { stats, intervals, currentMonthPurchases, recentPurchases, profile } = kpiData;

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground">No meter readings found for this user yet.</p>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReadingDate = new Date(stats.lastReadingDate);
  lastReadingDate.setHours(0, 0, 0, 0);
  const daysSinceLastReading = Math.max(
    0,
    Math.floor((today.getTime() - lastReadingDate.getTime()) / MS_PER_DAY)
  );
  const effectiveBurnRate = stats.dailyBurnRate > 0 ? stats.dailyBurnRate : DEFAULT_BURN_RATE;
  const estimatedUsageSince = daysSinceLastReading * effectiveBurnRate;

  const unitsThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.units, 0);
  const costThisMonth = currentMonthPurchases.reduce((sum, p) => sum + p.amountPaid, 0);

  const rowClass = "transition-none hover:bg-muted/30";
  const headerClass = "bg-muted/50 transition-none hover:bg-muted/50";
  const cellXs = "text-xs";
  const monoXs = "font-mono text-xs";

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">{userName}</p>

      {/* ── Row 1: Est Balance + Days Remaining side-by-side ─────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Estimated Balance */}
        <Card className="rounded-md border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Estimated Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                Anchor — last readingPost
                <span className="block text-[11px]">({stats.lastReadingDate})</span>
              </span>
              <span className={`${monoXs} shrink-0`}>{stats.lastReading.toFixed(2)} kWh</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Days since last reading</span>
              <span className={`${monoXs} shrink-0`}>{daysSinceLastReading} days</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">
                Daily burn rate
                {stats.isEstimatedBurnRate && (
                  <span className="block text-[11px] italic">(estimated default)</span>
                )}
              </span>
              <span className={`${monoXs} shrink-0`}>{effectiveBurnRate.toFixed(2)} kWh/d</span>
            </div>
            <div className="flex items-start justify-between gap-2 text-muted-foreground/70">
              <span className="text-[11px]">
                Usage = {daysSinceLastReading} × {effectiveBurnRate.toFixed(2)}
              </span>
              <span className="shrink-0 font-mono text-[11px]">
                −{estimatedUsageSince.toFixed(2)} kWh
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 font-semibold">
              <span>Est. Balance</span>
              <span className="font-mono text-sm text-primary">
                {stats.estimatedBalance.toFixed(2)} kWh
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Days Remaining */}
        <Card className="rounded-md border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Days Remaining</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Est. balance</span>
              <span className={`${monoXs} shrink-0`}>{stats.estimatedBalance.toFixed(2)} kWh</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Daily burn rate</span>
              <span className={`${monoXs} shrink-0`}>{effectiveBurnRate.toFixed(2)} kWh/d</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Low threshold</span>
              <span className={`${monoXs} shrink-0`}>{profile.lowBalanceThreshold} kWh</span>
            </div>
            <div className="flex items-start justify-between gap-2 border-t border-border pt-1.5 text-muted-foreground/70">
              <span className="text-[11px]">
                Until zero ({stats.estimatedBalance.toFixed(2)} ÷ {effectiveBurnRate.toFixed(2)})
              </span>
              <span className="shrink-0 font-mono text-[11px]">
                {stats.daysRemaining.toFixed(1)} days
              </span>
            </div>
            <div className="flex items-start justify-between gap-2 font-semibold">
              <div>
                <span>Until threshold</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  ({stats.estimatedBalance.toFixed(2)} − {profile.lowBalanceThreshold}) ÷{" "}
                  {effectiveBurnRate.toFixed(2)}
                </span>
              </div>
              <span className="shrink-0 font-mono text-sm text-primary">
                {stats.daysRemainingUntilLow.toFixed(1)} days
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Daily Usage (full width — table needs space) ───────── */}
      <Card className="rounded-md border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Daily Usage — Exponentially Weighted Average
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {intervals.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              Need at least 2 purchase readings to compute a burn rate.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className={headerClass}>
                    <TableHead className={cellXs}>Period</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Days</TableHead>
                    <TableHead className={`${cellXs} text-right`}>
                      Meter (older post → newer pre)
                    </TableHead>
                    <TableHead className={`${cellXs} text-right`}>Usage (kWh)</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Rate (kWh/d)</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Weight</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intervals.map((iv, i) => (
                    <TableRow
                      key={i}
                      className={`${rowClass} ${iv.isSkipped ? "line-through opacity-40" : ""}`}
                    >
                      <TableCell className={`${cellXs} whitespace-nowrap`}>
                        {iv.olderDate}
                        <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                        {iv.newerDate}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.daysDiff.toFixed(1)}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.olderReadingPost.toFixed(1)} → {iv.newerReadingPre.toFixed(1)}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.usage.toFixed(2)}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.rate.toFixed(2)}
                        {iv.isSkipped && (
                          <span className="not-line-through ml-1 text-[10px] text-destructive">
                            (skipped)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.isSkipped ? "—" : `${(iv.weight * MAX_TIER_PERCENTAGE).toFixed(1)}%`}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {iv.isSkipped ? "—" : (iv.rate * iv.weight).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={`${headerClass} font-semibold`}>
                    <TableCell colSpan={BURN_RATE_TABLE_COLS} className={cellXs}>
                      Weighted Average
                    </TableCell>
                    <TableCell className={`${monoXs} text-right`}>100%</TableCell>
                    <TableCell className={`${monoXs} text-right text-primary`}>
                      {stats.dailyBurnRate.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          {stats.isEstimatedBurnRate && (
            <p className="px-4 pb-3 pt-2 text-[11px] italic text-muted-foreground">
              Burn rate is estimated — using default value ({effectiveBurnRate} kWh/day).
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Row 3: This Month + Past 12 side-by-side ─────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-md border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">This Month's Purchases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {currentMonthPurchases.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No purchases this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={headerClass}>
                    <TableHead className={cellXs}>Date</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Units (kWh)</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMonthPurchases.map((p, i) => (
                    <TableRow key={i} className={rowClass}>
                      <TableCell className={cellXs}>{p.date}</TableCell>
                      <TableCell className={`${monoXs} text-right`}>{p.units.toFixed(1)}</TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {formatCurrency(p.amountPaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={`${headerClass} font-semibold`}>
                    <TableCell className={cellXs}>Total</TableCell>
                    <TableCell className={`${monoXs} text-right`}>
                      {unitsThisMonth.toFixed(1)}
                    </TableCell>
                    <TableCell className={`${monoXs} text-right`}>
                      {formatCurrency(costThisMonth)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Past 12 Purchases ──────────────────────────────────────── */}
        <Card className="rounded-md border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Past 12 Purchases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPurchases.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No purchases recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={headerClass}>
                    <TableHead className={cellXs}>Date</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Pre → Post</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Units</TableHead>
                    <TableHead className={`${cellXs} text-right`}>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchases.map((p, i) => (
                    <TableRow key={i} className={rowClass}>
                      <TableCell className={`${cellXs} whitespace-nowrap`}>{p.date}</TableCell>
                      <TableCell className={`${monoXs} whitespace-nowrap text-right`}>
                        {p.readingPre !== null && p.readingPost !== null
                          ? `${p.readingPre.toFixed(1)} → ${p.readingPost.toFixed(1)}`
                          : "—"}
                      </TableCell>
                      <TableCell className={`${monoXs} text-right`}>{p.units.toFixed(1)}</TableCell>
                      <TableCell className={`${monoXs} text-right`}>
                        {formatCurrency(p.amountPaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule a new rate period (new tariff effective from a chosen date)
// ---------------------------------------------------------------------------

function formatEffectiveFrom(date: string): string {
  if (!date) return "Baseline";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// eslint-disable-next-line llm-core/max-function-length
function ScheduleRatePeriod({
  rates,
  rateHistory,
  addRatePeriod,
}: {
  rates: ElectricityRate[];
  rateHistory: ElectricityRate[];
  addRatePeriod: (effectiveFrom: string, tiers: NewRatePeriodTier[]) => Promise<null>;
}) {
  const { toast } = useToast();
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [newRates, setNewRates] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSchedule = () => {
    void (async () => {
      if (!effectiveFrom) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: "Choose an effective date for the new rate period.",
          variant: "destructive",
        });
        return;
      }
      if (rateHistory.some((r) => r.effectiveFrom === effectiveFrom)) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: `A rate period already starts on ${effectiveFrom}.`,
          variant: "destructive",
        });
        return;
      }

      const tiers: NewRatePeriodTier[] = [];
      for (const rate of rates) {
        const raw = newRates[rate.tier_number];
        const value = raw === undefined || raw === "" ? rate.rate : Number(raw);
        if (isNaN(value) || value < RATE_MIN || value > RATE_MAX) {
          toast({
            title: INVALID_INPUT_TITLE,
            description: `${rate.tier_label}: ${RATE_INVALID_MESSAGE}`,
            variant: "destructive",
          });
          return;
        }
        tiers.push({
          tier_number: rate.tier_number,
          tier_label: rate.tier_label,
          min_units: rate.min_units,
          max_units: rate.max_units,
          rate: value,
        });
      }

      setSaving(true);
      try {
        await addRatePeriod(effectiveFrom, tiers);
        toast({
          title: "Rate Period Scheduled",
          description: `New tariff effective ${formatEffectiveFrom(effectiveFrom)}. Purchases on or after this date have been queued for repricing.`,
        });
        setEffectiveFrom("");
        setNewRates({});
      } catch (error) {
        toast({
          title: "Failed to Schedule",
          description:
            error instanceof Error
              ? error.message
              : "There was an error scheduling the rate period.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Schedule New Rate Period</CardTitle>
        <p className="text-sm text-muted-foreground">
          Load a new tariff effective from a chosen date. Purchases dated before it keep the old
          rates; purchases on or after it — including ones already recorded — are repriced
          automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label
            htmlFor="rate-period-effective-from"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Effective from
          </label>
          <Input
            id="rate-period-effective-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="h-9 w-full max-w-xs"
          />
        </div>

        <div className="space-y-2">
          {rates.map((rate) => (
            <div key={rate.tier_number} className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{rate.tier_label}</p>
                <p className="text-xs text-muted-foreground">
                  {rate.min_units} - {rate.max_units ?? "∞"} kWh · currently{" "}
                  {formatCurrency(rate.rate)}
                </p>
              </div>
              <Input
                type="number"
                step="0.00001"
                placeholder={rate.rate.toString()}
                value={newRates[rate.tier_number] ?? ""}
                onChange={(e) =>
                  setNewRates((prev) => ({ ...prev, [rate.tier_number]: e.target.value }))
                }
                className="h-9 w-32"
                data-testid={`new-rate-tier-${rate.tier_number}`}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSchedule} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="mr-2 h-4 w-4" />
          )}
          Schedule Rate Period
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rate history (all periods, newest first)
// ---------------------------------------------------------------------------

function RateHistoryCard({ rateHistory }: { rateHistory: ElectricityRate[] }) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-bold">All Rate Periods</CardTitle>
        <p className="text-sm text-muted-foreground">
          Read-only history of every tariff period, newest first, with the change from the period
          before it. This is the same view users see on the Rates page.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <RateHistoryTable history={rateHistory} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Dashboard
// ---------------------------------------------------------------------------

const INVALID_INPUT_TITLE = "Invalid Input";

// eslint-disable-next-line llm-core/max-function-length
export default function AdminDashboard(): JSX.Element {
  const {
    loading,
    globalStats,
    usersList,
    usersListStatus,
    loadMoreUsers,
    recentPurchases,
    rates,
    rateHistory,
    updateRate,
    addRatePeriod,
  } = useAdmin();

  const { toast } = useToast();

  const [editingRateId, setEditingRateId] = useState<Id<"electricity_rates"> | null>(null);
  const [editRateValues, setEditRateValues] = useState<{
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (usersListStatus === "CanLoadMore" && (activeTab === "users" || activeTab === "kpi")) {
      loadMoreUsers(USERS_LIST_PAGE_SIZE);
    }
  }, [usersListStatus, loadMoreUsers, activeTab]);

  const startEditing = (rate: {
    _id: Id<"electricity_rates">;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }) => {
    setEditingRateId(rate._id);
    setEditRateValues({
      tier_label: rate.tier_label,
      min_units: rate.min_units,
      max_units: rate.max_units,
      rate: rate.rate,
    });
  };

  const cancelEditing = () => {
    setEditingRateId(null);
    setEditRateValues(null);
  };

  const handleSaveRate = () => {
    void (async () => {
      if (!editingRateId || !editRateValues) return;

      const { tier_label, min_units, max_units, rate } = editRateValues;

      if (!tier_label.trim()) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: "Tier label cannot be empty.",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(min_units) || min_units < 0) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: "Minimum units must be a positive number.",
          variant: "destructive",
        });
        return;
      }

      if (max_units !== null && (isNaN(max_units) || max_units <= min_units)) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: "Maximum units must be greater than minimum units or left empty.",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(rate) || rate < 0) {
        toast({
          title: INVALID_INPUT_TITLE,
          description: "Rate must be a positive number.",
          variant: "destructive",
        });
        return;
      }

      try {
        await updateRate({
          id: editingRateId,
          tier_label: tier_label.trim(),
          min_units,
          max_units,
          rate,
        });
        toast({
          title: "Rate Updated",
          description:
            "The electricity rate tier has been updated. Affected purchases have been queued for repricing.",
        });
        setEditingRateId(null);
        setEditRateValues(null);
      } catch {
        toast({
          title: "Update Failed",
          description: "There was an error updating the rate tier.",
          variant: "destructive",
        });
      }
    })();
  };

  if (loading || !globalStats || !recentPurchases || !rates) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedUser = usersList.find((u) => u.userId === selectedUserId);
  const selectedUserName = selectedUser?.preferredName ?? selectedUser?.email ?? selectedUserId;

  // getRates only returns the rows in force today, so they all share one effectiveFrom.
  const currentEffectiveFrom = rates[0]?.effectiveFrom ?? BASELINE_EFFECTIVE_FROM;

  const tabTriggerClass =
    "relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

  return (
    <div className="min-h-screen bg-background pb-10">
      <SEO title="Admin Dashboard" noindex />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-4 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className={tabTriggerClass}>
              Users
            </TabsTrigger>
            <TabsTrigger value="purchases" className={tabTriggerClass}>
              Recent Purchases
            </TabsTrigger>
            <TabsTrigger value="kpi" className={tabTriggerClass}>
              KPI Breakdown
            </TabsTrigger>
            <TabsTrigger value="rates" className={tabTriggerClass}>
              Rates
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Volume
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats.totalUnits.toFixed(1)} kWh</div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(globalStats.totalRevenue)}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Avg User Consumption
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-2xl font-bold">
                    {globalStats.avgUnitsPerUser !== null ? (
                      `${globalStats.avgUnitsPerUser.toFixed(1)} kWh`
                    ) : globalStats.isPartial ? (
                      <>
                        <span aria-label="Unavailable — sampled data">— (sampled)</span>
                        <InfoTip
                          text={`Calculated from a sample of ${globalStats.sampledProfilesCount?.toLocaleString() ?? "?"} users and ${globalStats.sampledPurchasesCount?.toLocaleString() ?? "?"} purchases. Exact average not available.`}
                        />
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-muted-foreground">Database:</span>
                  <span className="text-foreground">Convex (Operational)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-muted-foreground">Auth:</span>
                  <span className="text-foreground">Clerk (Operational)</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users ─────────────────────────────────────────────────── */}
          <TabsContent value="users">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">User Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground">Name</TableHead>
                      <TableHead className="font-bold text-foreground">Email</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Role</TableHead>
                      <TableHead className="font-bold text-foreground">User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((user) => (
                      <TableRow key={user._id} className="transition-none hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {user.preferredName || "Anonymous"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                              user.role === "admin"
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-muted bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {user.userId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {usersListStatus === "LoadingMore" && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more…
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Recent Purchases ──────────────────────────────────────── */}
          <TabsContent value="purchases">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Recent Purchases (Global)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                        <TableHead className="font-bold text-foreground">Date</TableHead>
                        <TableHead className="font-bold text-foreground">User</TableHead>
                        <TableHead className="text-right font-bold text-foreground">
                          Pre → Post (kWh)
                        </TableHead>
                        <TableHead className="text-right font-bold text-foreground">
                          Units
                        </TableHead>
                        <TableHead className="text-right font-bold text-foreground">Paid</TableHead>
                        <TableHead className="text-right font-bold text-foreground">
                          R/kWh
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPurchases.map((purchase) => (
                        <TableRow key={purchase._id} className="transition-none hover:bg-muted/30">
                          <TableCell className="text-xs">
                            {new Date(purchase.date).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate text-xs">
                            {purchase.userName ?? (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {purchase.userId.slice(0, USER_ID_PREVIEW_LENGTH)}…
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {purchase.readingPre !== null && purchase.readingPost !== null ? (
                              <>
                                {purchase.readingPre.toFixed(1)}
                                <ArrowRight className="mx-0.5 inline h-3 w-3 text-muted-foreground" />
                                {purchase.readingPost.toFixed(1)}
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">
                            {purchase.units.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">
                            {formatCurrency(purchase.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {purchase.effectiveRate !== null
                              ? formatCurrency(purchase.effectiveRate)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KPI Breakdown ─────────────────────────────────────────── */}
          <TabsContent value="kpi" className="space-y-4">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">KPI Breakdown by User</CardTitle>
              </CardHeader>
              <CardContent>
                <label
                  htmlFor="kpi-user-select"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Select a user
                </label>
                <select
                  id="kpi-user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— choose a user —</option>
                  {usersList.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.preferredName ?? u.email ?? u.userId}
                    </option>
                  ))}
                </select>
                {usersListStatus === "LoadingMore" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading more users…
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedUserId && <KPIBreakdown userId={selectedUserId} userName={selectedUserName} />}
          </TabsContent>

          {/* ── Rates ─────────────────────────────────────────────────── */}
          <TabsContent value="rates" className="space-y-6">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  Current Rates — effective {formatEffectiveFrom(currentEffectiveFrom)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Corrects the figures of the tariff period currently in force — for fixing a wrong
                  number, not for a tariff change. Changing a rate or tier range reprices every
                  purchase recorded on or after this period started. To load a new tariff from a
                  future date instead, use Schedule New Rate Period below.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground">Tier</TableHead>
                      <TableHead className="font-bold text-foreground">Label</TableHead>
                      <TableHead className="font-bold text-foreground">Range (kWh)</TableHead>
                      <TableHead className="font-bold text-foreground">Rate</TableHead>
                      <TableHead className="text-right font-bold text-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate._id} className="transition-none hover:bg-muted/30">
                        <TableCell className="font-medium">Tier {rate.tier_number}</TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <Input
                              value={editRateValues?.tier_label}
                              onChange={(e) =>
                                setEditRateValues((prev) =>
                                  prev ? { ...prev, tier_label: e.target.value } : null
                                )
                              }
                              className="h-8 py-1"
                            />
                          ) : (
                            <span className="text-muted-foreground">{rate.tier_label}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editRateValues?.min_units}
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev ? { ...prev, min_units: Number(e.target.value) } : null
                                  )
                                }
                                className="h-8 w-20 py-1"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="number"
                                value={editRateValues?.max_units ?? ""}
                                placeholder="∞"
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          max_units:
                                            e.target.value === "" ? null : Number(e.target.value),
                                        }
                                      : null
                                  )
                                }
                                className="h-8 w-20 py-1"
                              />
                            </div>
                          ) : (
                            <span className="text-xs">
                              {rate.min_units} - {rate.max_units === null ? "∞" : rate.max_units}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">R</span>
                              <Input
                                type="number"
                                step="0.00001"
                                value={editRateValues?.rate}
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev ? { ...prev, rate: Number(e.target.value) } : null
                                  )
                                }
                                className="h-8 w-24 py-1"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-primary">
                              {formatCurrency(rate.rate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingRateId === rate._id ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveRate}
                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditing}
                                className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(rate)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <ScheduleRatePeriod
              rates={rates}
              rateHistory={rateHistory}
              addRatePeriod={addRatePeriod}
            />

            <RateHistoryCard rateHistory={rateHistory} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
