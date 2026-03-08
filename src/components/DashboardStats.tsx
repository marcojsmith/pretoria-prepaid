import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Receipt, BarChart3, Zap } from "lucide-react";

interface DashboardStatsProps {
  averageMonthlyUsage: number;
  dailyAverage: number;
  averageMonthlyCost: number;
}

export function DashboardStats({
  averageMonthlyUsage,
  dailyAverage,
  averageMonthlyCost,
}: DashboardStatsProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-6 pt-4">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Past 3 Months Average
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Average Usage</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold tracking-tight">
                {roundUnits(averageMonthlyUsage)}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">kWh/mo</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {roundUnits(dailyAverage)} kWh/day
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Average Spend</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold tracking-tight">
                {formatCurrency(averageMonthlyCost)}
                <span className="text-[10px] font-normal text-muted-foreground"> /mo</span>
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Avg Cost/kWh</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold tracking-tight">
                {averageMonthlyUsage > 0
                  ? formatCurrency(averageMonthlyCost / averageMonthlyUsage)
                  : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
