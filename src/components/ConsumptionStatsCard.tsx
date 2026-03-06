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

  return (
    <Card
      className={`border-primary/20 ${isLow ? "border-destructive/30 bg-destructive/10" : "bg-primary/5"}`}
    >
      <CardContent className="grid grid-cols-3 gap-2 p-3">
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
          <p className="text-[9px] text-muted-foreground">Threshold: {stats.lowBalanceThreshold}</p>
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
          <p className="text-[9px] text-muted-foreground">Until {stats.lowBalanceThreshold} kWh</p>
        </div>
      </CardContent>
    </Card>
  );
}
