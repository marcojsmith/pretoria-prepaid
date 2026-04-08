import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { roundUnits, formatCurrency } from "@/lib/electricity";
import type { ConsumptionStats } from "@/hooks/useConsumption";
import { InfoTip } from "@/components/InfoTip";
import { MS_PER_DAY, DAYS_IN_WEEK } from "@/lib/constants";

interface ConsumptionStatsCardProps {
  stats: ConsumptionStats | null;
  unitsThisMonth: number;
  costThisMonth: number;
}

const TEXT_DESTRUCTIVE = "text-destructive";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  infoTipText: string;
  value: React.ReactNode;
  subValue: string;
  destructive?: boolean;
}

function StatItem({ icon, label, infoTipText, value, subValue, destructive }: StatItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
        <InfoTip text={infoTipText} />
      </div>
      <div className="space-y-0.5">
        <p
          className={`text-lg font-bold tracking-tight ${destructive ? TEXT_DESTRUCTIVE : "text-foreground"}`}
        >
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground">{subValue}</p>
      </div>
    </div>
  );
}

function StaleWarning({ daysSinceLastReading }: { daysSinceLastReading: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Data may be stale</span>
      </div>
      <span className="text-[10px] text-muted-foreground">
        Last reading {daysSinceLastReading} days ago
      </span>
    </div>
  );
}

export function ConsumptionStatsCard({
  stats,
  unitsThisMonth,
  costThisMonth,
}: ConsumptionStatsCardProps): JSX.Element | null {
  if (!stats) return null;

  const isLow = stats.estimatedBalance <= stats.lowBalanceThreshold;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + Math.ceil(stats.daysRemainingUntilLow));

  const readingDate = stats.lastReadingDate ? new Date(stats.lastReadingDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysSinceLastReading = 0;
  let isStale = false;

  if (readingDate && !isNaN(readingDate.getTime())) {
    readingDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - readingDate.getTime();
    daysSinceLastReading = Math.max(0, Math.floor(diffTime / MS_PER_DAY));
    isStale = daysSinceLastReading > DAYS_IN_WEEK || diffTime < 0;
  } else {
    isStale = true;
  }

  return (
    <Card className={`border-border bg-card`}>
      <CardContent className="space-y-4 pt-4">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Current Month
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-4">
          <StatItem
            icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
            label="Purchased units"
            infoTipText="Total kWh purchased so far this calendar month, based on your logged purchases."
            value={
              <>
                {roundUnits(unitsThisMonth)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </>
            }
            subValue={formatCurrency(costThisMonth)}
          />

          <StatItem
            icon={<Zap className={`h-3.5 w-3.5 ${isLow ? TEXT_DESTRUCTIVE : "text-primary"}`} />}
            label="Est. Balance"
            infoTipText="Meter reading after your last purchase, minus estimated consumption since then (daily usage × days elapsed)."
            value={
              <>
                {roundUnits(stats.estimatedBalance)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </>
            }
            subValue={`Threshold: ${stats.lowBalanceThreshold} kWh`}
            destructive={isLow}
          />

          <StatItem
            icon={<TrendingDown className="h-3.5 w-3.5 text-primary" />}
            label="Daily Usage"
            infoTipText="Weighted average of your last 5 purchase intervals. Recent intervals count more than older ones, so a holiday or unusual period won't skew the result."
            value={
              <>
                {roundUnits(stats.dailyBurnRate)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh/d</span>
              </>
            }
            subValue={stats.isEstimatedBurnRate ? "Based on estimate" : ""}
          />

          <StatItem
            icon={<Calendar className="h-3.5 w-3.5 text-primary" />}
            label="Days Left"
            infoTipText="How many days until your balance drops to the low balance threshold, at your current daily usage rate."
            value={
              <>
                {Math.ceil(stats.daysRemainingUntilLow)}{" "}
                <span className="text-xs font-normal text-muted-foreground">Days</span>
              </>
            }
            subValue={`Until ${stats.lowBalanceThreshold} kWh`}
            destructive={isLow}
          />
        </div>

        {isStale && <StaleWarning daysSinceLastReading={daysSinceLastReading} />}
      </CardContent>
    </Card>
  );
}
