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
    <Card className={`border-border bg-card`}>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className={`h-3.5 w-3.5 ${isLow ? "text-destructive" : "text-primary"}`} />
              <span>Est. Balance</span>
            </div>
            <div className="space-y-0.5">
              <p
                className={`text-lg font-bold tracking-tight ${isLow ? "text-destructive" : "text-foreground"}`}
              >
                {roundUnits(stats.estimatedBalance)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Threshold: {stats.lowBalanceThreshold} kWh
              </p>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-primary" />
              <span>Daily Usage</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold tracking-tight text-foreground">
                {roundUnits(stats.dailyBurnRate)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh/d</span>
              </p>
              {stats.isEstimatedBurnRate && (
                <p className="text-[10px] italic text-muted-foreground">Based on estimate</p>
              )}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Days Left</span>
            </div>
            <div className="space-y-0.5">
              <p
                className={`text-lg font-bold tracking-tight ${isLow ? "text-destructive" : "text-foreground"}`}
              >
                {Math.ceil(stats.daysRemainingUntilLow)}{" "}
                <span className="text-xs font-normal text-muted-foreground">Days</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Until {stats.lowBalanceThreshold} kWh
              </p>
            </div>
          </div>
        </div>

        {isStale && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Data may be stale</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Last reading {daysSinceLastReading} days ago
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
