import { Card, CardContent } from "@/components/ui/card";
import { Zap, Calendar, TrendingDown, AlertTriangle } from "lucide-react";
import { roundUnits } from "@/lib/electricity";
import { ConsumptionStats } from "@/hooks/useConsumption";

interface ConsumptionStatsCardProps {
  stats: ConsumptionStats | null;
}

export function ConsumptionStatsCard({ stats }: ConsumptionStatsCardProps) {
  if (!stats) return null;

  const isLow = stats.estimatedBalance <= stats.lowBalanceThreshold;
  const endDate = new Date();
  // We show the end date for the LOW threshold, not zero
  endDate.setDate(endDate.getDate() + Math.ceil(stats.daysRemainingUntilLow));

  const readingDate = stats.lastReadingDate ? new Date(stats.lastReadingDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysSinceLastReading = 0;
  let isStale = false;

  if (readingDate && !isNaN(readingDate.getTime())) {
    readingDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - readingDate.getTime();
    daysSinceLastReading = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    // Stale if last reading is older than 7 days, OR if it's in the future (invalid)
    isStale = daysSinceLastReading > 7 || diffTime < 0;
  } else {
    isStale = true; // Treat missing or invalid date as stale
  }

  return (
    <Card
      className={`border-primary/20 ${isLow ? "border-destructive/30 bg-destructive/10" : "bg-primary/5"}`}
    >
      <CardContent className="space-y-2 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {isLow ? (
                <AlertTriangle className="h-3 w-3 animate-pulse text-destructive" />
              ) : (
                <Zap className="h-3 w-3 text-primary" />
              )}
              <span>Est. Balance</span>
            </div>
            <p className={`text-sm font-bold ${isLow ? "text-destructive" : ""}`}>
              {roundUnits(stats.estimatedBalance)} kWh
            </p>
            <p className="text-[9px] text-muted-foreground">
              Threshold: {stats.lowBalanceThreshold}
            </p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-primary" />
              <span>Daily Usage</span>
            </div>
            <p className="text-sm font-bold">{roundUnits(stats.dailyBurnRate)} kWh/d</p>
            {stats.isEstimatedBurnRate && (
              <p className="text-[9px] italic text-muted-foreground">Estimate</p>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3 text-primary" />
              <span>Days Left</span>
            </div>
            <p className={`text-sm font-bold ${isLow ? "text-destructive" : ""}`}>
              {Math.ceil(stats.daysRemainingUntilLow)} Days
            </p>
            <p className="text-[9px] text-muted-foreground">
              Until {stats.lowBalanceThreshold} kWh
            </p>
          </div>
        </div>

        {isStale && (
          <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-100/50 px-2 py-1 dark:border-amber-900/30 dark:bg-amber-950/30">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Stale Data</span>
            </div>
            <span className="text-[9px] text-amber-700/70 dark:text-amber-500/50">
              Last reading {daysSinceLastReading}d old
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
