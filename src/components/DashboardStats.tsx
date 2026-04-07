import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Receipt, BarChart3, Zap } from "lucide-react";
import { InfoTip } from "@/components/InfoTip";

interface DashboardStatsProps {
  averageMonthlyUsage: number;
  averageMonthlyCost: number;
}

export function DashboardStats({ averageMonthlyUsage, averageMonthlyCost }: DashboardStatsProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 pt-4">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Past 3 Months Average
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Average Purchased</span>
              <InfoTip text="Average kWh purchased per month over the last 3 months." />
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold tracking-tight text-foreground">
                {roundUnits(averageMonthlyUsage)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </p>
              <p className="text-[10px] text-muted-foreground">per month</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Average Spend</span>
              <InfoTip text="Average amount paid per month over the last 3 months." />
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold tracking-tight text-foreground">
                {formatCurrency(averageMonthlyCost)}
              </p>
              <p className="text-[10px] text-muted-foreground">per month</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Avg Cost/kWh</span>
              <InfoTip text="Average spend divided by average usage over the last 3 months. Reflects your actual blended rate across tiers." />
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold tracking-tight text-foreground">
                {averageMonthlyUsage > 0
                  ? formatCurrency(averageMonthlyCost / averageMonthlyUsage)
                  : formatCurrency(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">blended rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
