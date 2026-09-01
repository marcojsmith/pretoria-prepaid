import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/electricity";
import type { ElectricityRate } from "@/hooks/useRates";

// Rate rows predating the effectiveFrom field are the 2025/26 municipal tariff.
export const BASELINE_EFFECTIVE_FROM = "2025-07-01";
const PERCENT = 100;
const NEGLIGIBLE_CHANGE = 0.05;

interface RatePeriod {
  effectiveFrom: string;
  ratesByTier: Map<number, number>;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Groups rate rows into one period per effectiveFrom, newest first. */
function buildPeriods(history: ElectricityRate[]): RatePeriod[] {
  const byEffectiveFrom = new Map<string, Map<number, number>>();
  for (const row of history) {
    const key = row.effectiveFrom ?? BASELINE_EFFECTIVE_FROM;
    const tiers = byEffectiveFrom.get(key) ?? new Map<number, number>();
    tiers.set(row.tier_number, row.rate);
    byEffectiveFrom.set(key, tiers);
  }

  return [...byEffectiveFrom.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([effectiveFrom, ratesByTier]) => ({ effectiveFrom, ratesByTier }));
}

function collectTierNumbers(periods: RatePeriod[]): number[] {
  const tiers = new Set<number>();
  for (const period of periods) {
    for (const tier of period.ratesByTier.keys()) tiers.add(tier);
  }
  return [...tiers].sort((a, b) => a - b);
}

function PercentChange({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === 0) return null;

  const change = ((current - previous) / previous) * PERCENT;
  if (Math.abs(change) < NEGLIGIBLE_CHANGE) return null;

  return (
    <span
      className={`block text-[10px] ${
        change > 0 ? "text-destructive" : "text-green-600 dark:text-green-500"
      }`}
    >
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

/**
 * Rate history as a matrix: one row per tariff period (newest first), one column
 * per tier, with each cell showing the rate and its change from the period before it.
 */
export function RateHistoryTable({ history }: { history: ElectricityRate[] }): JSX.Element {
  const periods = buildPeriods(history);
  const tierNumbers = collectTierNumbers(periods);
  const today = new Date().toISOString().split("T")[0] ?? "";
  // Periods are newest-first, so the first one that has started is in force.
  const currentEffectiveFrom = periods.find((p) => p.effectiveFrom <= today)?.effectiveFrom;

  if (periods.length === 0) {
    return (
      <p className="px-4 pb-6 text-center text-xs text-muted-foreground">
        No rates have been configured yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
            <TableHead className="text-xs font-bold text-foreground">Effective from</TableHead>
            {tierNumbers.map((tier) => (
              <TableHead key={tier} className="text-right text-xs font-bold text-foreground">
                Tier {tier}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period, index) => {
            // Rows descend from newest to oldest, so the previous period is the row below.
            const previous = periods[index + 1];
            const isCurrent = period.effectiveFrom === currentEffectiveFrom;
            return (
              <TableRow key={period.effectiveFrom} className="transition-none hover:bg-muted/30">
                <TableCell className="whitespace-nowrap text-xs">
                  <span className={isCurrent ? "font-semibold" : ""}>
                    {formatDate(period.effectiveFrom)}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Current
                    </span>
                  )}
                  {period.effectiveFrom > today && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Upcoming
                    </span>
                  )}
                </TableCell>
                {tierNumbers.map((tier) => {
                  const rate = period.ratesByTier.get(tier);
                  return (
                    <TableCell
                      key={tier}
                      className="whitespace-nowrap text-right font-mono text-xs"
                    >
                      {rate === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {formatCurrency(rate)}
                          <PercentChange
                            current={rate}
                            previous={previous?.ratesByTier.get(tier)}
                          />
                        </>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
