import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Receipt, BarChart3, History } from "lucide-react";

interface DashboardStatsProps {
  unitsThisMonth: number;
  costThisMonth: number;
  averageMonthlyUsage: number;
  dailyAverage: number;
  averageMonthlyCost: number;
  monthlyBudget?: number | undefined;
}

export function DashboardStats({
  unitsThisMonth,
  costThisMonth,
  averageMonthlyUsage,
  dailyAverage,
  averageMonthlyCost,
  monthlyBudget,
}: DashboardStatsProps) {
  const hasBudget = typeof monthlyBudget === "number" && monthlyBudget > 0;
  const budgetProgress = hasBudget ? Math.min((costThisMonth / monthlyBudget) * 100, 100) : 0;

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-6 pt-4">
        {hasBudget && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Receipt className="h-3.5 w-3.5 text-primary" />
                <span>Monthly Budget</span>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {formatCurrency(costThisMonth)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {formatCurrency(monthlyBudget)}
                </span>
              </span>
            </div>
            <div className="space-y-1.5">
              <Progress value={budgetProgress} className="h-2" />
              <div className="flex justify-end">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {budgetProgress >= 100
                    ? "Budget exceeded"
                    : `${Math.round(100 - budgetProgress)}% remaining`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Usage</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold tracking-tight">
                {roundUnits(unitsThisMonth)}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">kWh</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{formatCurrency(costThisMonth)}</p>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5 text-primary" />
              <span>Average</span>
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

          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" />
              <span>Spend</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold tracking-tight">
                {formatCurrency(averageMonthlyCost)}
                <span className="text-[10px] font-normal text-muted-foreground"> /mo</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Last 3 months</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
