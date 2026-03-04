import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, roundUnits } from "@/lib/electricity";
import { Calculator, Plus } from "lucide-react";

interface DashboardStatsProps {
  unitsThisMonth: number;
  costThisMonth: number;
  averageMonthlyUsage: number;
  dailyAverage: number;
  averageMonthlyCost: number;
}

export function DashboardStats({
  unitsThisMonth,
  costThisMonth,
  averageMonthlyUsage,
  dailyAverage,
  averageMonthlyCost,
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
  ];

  return (
    <div className="space-y-2">
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
      <div className="grid grid-cols-2 gap-2">
        {actionCards.map((action) => (
          <Card
            key={action.label}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={action.onClick}
          >
            <CardContent className="flex items-center justify-center gap-2 p-3">
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{action.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
