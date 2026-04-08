import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Receipt, BarChart3, Zap } from "lucide-react";
import { InfoTip } from "@/components/InfoTip";

interface DashboardStatsProps {
  averageMonthlyUsage: number;
  averageMonthlyCost: number;
}

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  infoTipText: string;
  value: React.ReactNode;
  subValue: string;
}

function StatBox({ icon, label, infoTipText, value, subValue }: StatBoxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
        <InfoTip text={infoTipText} />
      </div>
      <div className="space-y-0.5">
        <p className="text-lg font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{subValue}</p>
      </div>
    </div>
  );
}

export function DashboardStats({
  averageMonthlyUsage,
  averageMonthlyCost,
}: DashboardStatsProps): JSX.Element {
  const blendedRate =
    averageMonthlyUsage > 0
      ? formatCurrency(averageMonthlyCost / averageMonthlyUsage)
      : formatCurrency(0);

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 pt-4">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Past 3 Months Average
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-4">
          <StatBox
            icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
            label="Average Purchased"
            infoTipText="Average kWh purchased per month over the last 3 months."
            value={
              <>
                {roundUnits(averageMonthlyUsage)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </>
            }
            subValue="per month"
          />

          <StatBox
            icon={<Receipt className="h-3.5 w-3.5 text-primary" />}
            label="Average Spend"
            infoTipText="Average amount paid per month over the last 3 months."
            value={formatCurrency(averageMonthlyCost)}
            subValue="per month"
          />

          <StatBox
            icon={<Zap className="h-3.5 w-3.5 text-primary" />}
            label="Avg Cost/kWh"
            infoTipText="Average spend divided by average usage over the last 3 months. Reflects your actual blended rate across tiers."
            value={blendedRate}
            subValue="blended rate"
          />
        </div>
      </CardContent>
    </Card>
  );
}
