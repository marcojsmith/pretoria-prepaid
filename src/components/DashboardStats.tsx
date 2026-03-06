import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Calculator, Plus, Activity } from "lucide-react";

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
  const navigate = useNavigate();

  const stats = [
    {
      label: "This Month",
      value: `${roundUnits(unitsThisMonth)} kWh`,
      subValue: formatCurrency(costThisMonth),
    },
    {
      label: "Average Usage",
      value: `${roundUnits(averageMonthlyUsage)} kWh/mo`,
      subValue: `${roundUnits(dailyAverage)} kWh/day`,
    },
    {
      label: "Average Spend",
      value: `${formatCurrency(averageMonthlyCost)}/mo`,
      subValue: "Based on last 3 months",
    },
  ];

  const actionCards = [
    {
      label: "Calculator",
      icon: Calculator,
      onClick: () => navigate("/calculator"),
    },
    {
      label: "Record",
      icon: Plus,
      onClick: () => navigate("/history"),
    },
    {
      label: "Meter",
      icon: Activity,
      onClick: () => navigate("/history", { state: { showReadings: true } }),
    },
  ];

  const hasBudget = typeof monthlyBudget === "number" && monthlyBudget > 0;
  const budgetProgress = hasBudget ? Math.min((costThisMonth / monthlyBudget) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      {hasBudget && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Budget
                </span>
                <span className="font-medium">
                  {formatCurrency(costThisMonth)} / {formatCurrency(monthlyBudget)}
                </span>
              </div>
              <Progress value={budgetProgress} className="h-1.5" />
              <div className="flex justify-end">
                <span className="text-[10px] italic text-muted-foreground">
                  {budgetProgress >= 100
                    ? "Budget exceeded!"
                    : `${Math.round(100 - budgetProgress)}% remaining`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="space-y-0.5">
                <p className="truncate text-[10px] text-muted-foreground">{stat.label}</p>
                <p className="truncate text-sm font-bold">{stat.value}</p>
                <p className="truncate text-[10px] text-muted-foreground">{stat.subValue}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {actionCards.map((action) => (
          <Card
            key={action.label}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={action.onClick}
          >
            <CardContent className="flex flex-col items-center justify-center gap-1 p-3">
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium">{action.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
