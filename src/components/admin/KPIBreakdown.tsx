import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/electricity";
import { Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MS_PER_DAY, DEFAULT_BURN_RATE } from "@/lib/constants";

const ESTIMATED_RATE_PER_KWH = 2.5;
const BURN_RATE_DAYS = 30;
const HIGH_USAGE_THRESHOLD = 15;
const MEDIUM_USAGE_THRESHOLD = 10;
const RECENT_PURCHASES_COUNT = 10;
const CARD_TITLE_CLASSES = "text-sm font-semibold";
const ROW_CLASS = "transition-none hover:bg-muted/30";
const HEADER_CLASS = "bg-muted/50 transition-none hover:bg-muted/50";
const CELL_XS = "text-xs";
const MONO_XS = "font-mono text-xs";

interface AdminKPIDataStats {
  lastReadingDate: string;
  dailyBurnRate: number;
  estimatedBalance: number;
  daysRemaining: number;
  averageDailyUsage: number;
  lastReading: number;
  isEstimatedBurnRate: boolean;
}

interface AdminKPIDataInterval {
  date: string;
  units: number;
}

interface AdminKPIDataPurchase {
  date: string;
  units: number;
  amountPaid: number;
  readingPre: number | null;
  readingPost: number | null;
}

interface AdminKPIData {
  stats: AdminKPIDataStats | null;
  intervals: AdminKPIDataInterval[];
  currentMonthPurchases: AdminKPIDataPurchase[];
  recentPurchases: AdminKPIDataPurchase[];
  profile: { lowBalanceThreshold: number; defaultDailyUsage: number | null } | null;
}

function EstimatedBalanceCard({
  stats,
  daysSinceLastReading,
  estimatedUsageSince,
}: {
  stats: AdminKPIDataStats;
  daysSinceLastReading: number;
  estimatedUsageSince: number;
}) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={CARD_TITLE_CLASSES}>Estimated Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground">
            Anchor — last reading
            <span className="block text-[11px]">({stats.lastReadingDate})</span>
          </span>
          <span className="font-mono font-medium">{stats.estimatedBalance.toFixed(1)} kWh</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground">
            Usage since last reading
            <span className="block text-[11px]">({daysSinceLastReading} days)</span>
          </span>
          <span className="font-mono font-medium text-destructive">
            -{estimatedUsageSince.toFixed(1)} kWh
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 border-t pt-1.5">
          <span className="text-muted-foreground">Projected remaining</span>
          <span
            className={`font-mono font-medium ${
              stats.estimatedBalance - estimatedUsageSince <= 0 ? "text-destructive" : ""
            }`}
          >
            {Math.max(0, stats.estimatedBalance - estimatedUsageSince).toFixed(1)} kWh
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DaysRemainingCard({
  stats,
  effectiveBurnRate,
  estimatedUsageSince,
}: {
  stats: AdminKPIDataStats;
  effectiveBurnRate: number;
  estimatedUsageSince: number;
}) {
  const remainingBalance = Math.max(0, stats.estimatedBalance - estimatedUsageSince);
  const daysRemaining = effectiveBurnRate > 0 ? remainingBalance / effectiveBurnRate : 0;
  const isCritical = daysRemaining <= 7;

  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={CARD_TITLE_CLASSES}>Days Remaining</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground">Based on burn rate</span>
          <span className={`font-mono font-medium ${isCritical ? "text-destructive" : ""}`}>
            ~{Math.floor(daysRemaining)} days
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground">Burn rate</span>
          <span className="font-mono font-medium">{effectiveBurnRate.toFixed(1)} kWh/day</span>
        </div>
        <div className="flex items-start justify-between gap-2 border-t pt-1.5">
          <span className="text-muted-foreground">Daily budget</span>
          <span className="font-mono font-medium">
            R{(effectiveBurnRate * ESTIMATED_RATE_PER_KWH).toFixed(0)}/day
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageStatsCard({
  stats,
  unitsThisMonth,
  costThisMonth,
  purchaseCount,
}: {
  stats: AdminKPIDataStats;
  unitsThisMonth: number;
  costThisMonth: number;
  purchaseCount: number;
}) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={CARD_TITLE_CLASSES}>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className={HEADER_CLASS}>
              <TableHead className="font-bold text-foreground">Period</TableHead>
              <TableHead className="text-right font-bold text-foreground">kWh</TableHead>
              <TableHead className="text-right font-bold text-foreground">Cost</TableHead>
              <TableHead className="text-right font-bold text-foreground">Refills</TableHead>
              <TableHead className="text-right font-bold text-foreground">Avg/Refill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className={ROW_CLASS}>
              <TableCell className={CELL_XS}>This month</TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>{unitsThisMonth.toFixed(1)}</TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                {formatCurrency(costThisMonth)}
              </TableCell>
              <TableCell className={CELL_XS}>{purchaseCount}</TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                {purchaseCount > 0 ? (unitsThisMonth / purchaseCount).toFixed(1) : "—"}
              </TableCell>
            </TableRow>
            <TableRow className={ROW_CLASS}>
              <TableCell className={CELL_XS}>Daily avg (30d)</TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                {stats.averageDailyUsage.toFixed(1)}
              </TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                R{(stats.averageDailyUsage * ESTIMATED_RATE_PER_KWH).toFixed(0)}
              </TableCell>
              <TableCell className={CELL_XS}>—</TableCell>
              <TableCell className={`${CELL_XS} ${MONO_XS}`}>—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BurnRateTable({ intervals }: { intervals: AdminKPIDataInterval[] }) {
  const BURN_RATE_TABLE_COLS = 5;
  const recentIntervals = intervals.slice(-BURN_RATE_DAYS);
  const rows: AdminKPIDataInterval[][] = [];

  for (let i = 0; i < recentIntervals.length; i += BURN_RATE_TABLE_COLS) {
    rows.push(recentIntervals.slice(i, i + BURN_RATE_TABLE_COLS));
  }

  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={CARD_TITLE_CLASSES}>Burn Rate (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={HEADER_CLASS}>
                {Array.from({ length: BURN_RATE_TABLE_COLS }).map((_, i) => (
                  <TableHead key={i} className="text-center font-bold text-foreground">
                    Day {i + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className={ROW_CLASS}>
                  {row.map((interval, colIdx) => (
                    <TableCell key={colIdx} className="cellXs text-center font-mono">
                      <span
                        className={
                          interval.units > HIGH_USAGE_THRESHOLD
                            ? "font-semibold text-destructive"
                            : interval.units > MEDIUM_USAGE_THRESHOLD
                              ? "text-warning"
                              : ""
                        }
                      >
                        {interval.units.toFixed(1)}
                      </span>
                    </TableCell>
                  ))}
                  {row.length < BURN_RATE_TABLE_COLS &&
                    Array.from({ length: BURN_RATE_TABLE_COLS - row.length }).map((_, i) => (
                      <TableCell key={`empty-${i}`} className="text-center text-muted-foreground">
                        —
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentPurchasesList({ recentPurchases }: { recentPurchases: AdminKPIDataPurchase[] }) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className={CARD_TITLE_CLASSES}>Recent Refills</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className={HEADER_CLASS}>
              <TableHead className="font-bold text-foreground">Date</TableHead>
              <TableHead className="text-right font-bold text-foreground">kWh</TableHead>
              <TableHead className="text-right font-bold text-foreground">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentPurchases.slice(0, RECENT_PURCHASES_COUNT).map((purchase, idx) => (
              <TableRow key={idx} className={ROW_CLASS}>
                <TableCell className={CELL_XS}>
                  {new Date(purchase.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </TableCell>
                <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                  {purchase.units.toFixed(1)}
                </TableCell>
                <TableCell className={`${CELL_XS} ${MONO_XS}`}>
                  {formatCurrency(purchase.amountPaid)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function KPIBreakdown({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}): JSX.Element {
  const kpiData = useQuery(api.admin.getUserKPIData, { userId }) as AdminKPIData | undefined;

  if (kpiData === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const { stats, intervals, currentMonthPurchases, recentPurchases: recPurchases } = kpiData;

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

  return (
    <div className="space-y-4">
      <p className="CARD_TITLE_CLASSES text-foreground">{userName}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EstimatedBalanceCard
          stats={stats}
          daysSinceLastReading={daysSinceLastReading}
          estimatedUsageSince={estimatedUsageSince}
        />
        <DaysRemainingCard
          stats={stats}
          effectiveBurnRate={effectiveBurnRate}
          estimatedUsageSince={estimatedUsageSince}
        />
      </div>

      <UsageStatsCard
        stats={stats}
        unitsThisMonth={unitsThisMonth}
        costThisMonth={costThisMonth}
        purchaseCount={currentMonthPurchases.length}
      />

      {intervals.length > 0 && <BurnRateTable intervals={intervals} />}

      {recPurchases.length > 0 && <RecentPurchasesList recentPurchases={recPurchases} />}
    </div>
  );
}
