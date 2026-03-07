import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  getMonthName,
  getTierBreakdownForUnits,
  TIER_BG_CLASSES,
  TIER_TEXT_CLASSES,
  getCurrentMonth,
  roundUnits,
  ElectricityRate,
} from "@/lib/electricity";
import { BarChart3, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRates } from "@/hooks/useRates";

interface MonthlyStatsProps {
  stats: { month: string; units: number; cost: number; purchases: number }[];
  averageUsage: number;
}

export function MonthlyStats({ stats, averageUsage }: MonthlyStatsProps) {
  const { rates, loading: ratesLoading } = useRates();

  if (ratesLoading) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-3 w-3 text-primary" />
            Monthly Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-xs text-muted-foreground">
            No monthly data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxUnits = Math.max(...stats.map((s) => s.units));
  const currentMonth = getCurrentMonth();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-3 w-3 text-primary" />
          Monthly Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[180px] pr-4">
          <div className="space-y-3">
            {stats.map((stat) => {
              const tierBreakdown = getTierBreakdownForUnits(
                stat.units,
                rates as ElectricityRate[]
              );
              const totalWidth = (stat.units / maxUnits) * 100;
              const isCurrentMonth = stat.month === currentMonth;
              const isAboveAverage = stat.units > averageUsage;

              return (
                <div key={stat.month} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">
                      {getMonthName(stat.month)}
                      {isCurrentMonth && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(current)</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {roundUnits(stat.units)} kWh • {formatCurrency(stat.cost)}
                      {!isCurrentMonth && averageUsage > 0 && (
                        <span
                          className={`ml-1 ${isAboveAverage ? "text-destructive" : "text-primary"}`}
                        >
                          {isAboveAverage ? "↑" : "↓"}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Tier-segmented progress bar */}
                  <div className="h-1.5 overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full overflow-hidden rounded-md"
                      style={{ width: `${totalWidth}%` }}
                    >
                      {tierBreakdown.map((item) => {
                        const segmentWidth = (item.units / stat.units) * 100;
                        return (
                          <div
                            key={item.tier}
                            className={`h-full ${TIER_BG_CLASSES[item.tier as keyof typeof TIER_BG_CLASSES]}`}
                            style={{ width: `${segmentWidth}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Tier breakdown text */}
                  <div className="flex flex-wrap gap-x-1.5 text-[10px] text-muted-foreground">
                    {tierBreakdown.map((item, index) => (
                      <span key={item.tier}>
                        <span
                          className={`font-medium ${TIER_TEXT_CLASSES[item.tier as keyof typeof TIER_TEXT_CLASSES]}`}
                        >
                          {roundUnits(item.units)}
                        </span>
                        <span> {item.label}</span>
                        {index < tierBreakdown.length - 1 && <span> •</span>}
                      </span>
                    ))}
                    <span className="ml-auto">
                      {stat.purchases} purchase{stat.purchases !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
