import { ConsumptionStatsCard } from "@/components/ConsumptionStatsCard";
import { DashboardStats } from "@/components/DashboardStats";
import { TierProgress } from "@/components/TierProgress";
import { MonthlyStats } from "@/components/MonthlyStats";
import { YearlyConsumptionChart } from "@/components/YearlyConsumptionChart";
import { AverageDailyUsageChart } from "@/components/AverageDailyUsageChart";
import { PurchaseFrequencyChart } from "@/components/PurchaseFrequencyChart";
import type { CardConfig } from "@/hooks/useDashboardLayout";
import type { ConsumptionStats } from "@/hooks/useConsumption";

interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

interface DashboardGridProps {
  cards: CardConfig[];
  consumptionStats: ConsumptionStats | null;
  unitsThisMonth: number;
  costThisMonth: number;
  averageMonthlyUsage: number;
  averageMonthlyCost: number;
  monthlyStats: MonthlyStat[];
}

type CardRenderer = () => JSX.Element | null;

export function DashboardGrid({
  cards,
  consumptionStats,
  unitsThisMonth,
  costThisMonth,
  averageMonthlyUsage,
  averageMonthlyCost,
  monthlyStats,
}: DashboardGridProps): JSX.Element {
  const hasHistory = monthlyStats.length > 0;

  const renderers: Record<string, CardRenderer> = {
    "consumption-stats": () => (
      <ConsumptionStatsCard
        stats={consumptionStats}
        unitsThisMonth={unitsThisMonth}
        costThisMonth={costThisMonth}
      />
    ),
    "dashboard-stats": () => (
      <DashboardStats
        averageMonthlyUsage={averageMonthlyUsage}
        averageMonthlyCost={averageMonthlyCost}
      />
    ),
    "tier-progress": () => <TierProgress unitsBought={unitsThisMonth} />,
    "monthly-stats": () =>
      hasHistory ? <MonthlyStats stats={monthlyStats} averageUsage={averageMonthlyUsage} /> : null,
    "yearly-chart": () => (hasHistory ? <YearlyConsumptionChart /> : null),
    "daily-chart": () => (hasHistory ? <AverageDailyUsageChart /> : null),
    "frequency-chart": () => (hasHistory ? <PurchaseFrequencyChart stats={monthlyStats} /> : null),
  };

  const visibleCards = cards.filter((c) => c.visible);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {visibleCards.map((card) => {
        const render = renderers[card.id];
        if (!render) {
          return null;
        }
        const element = render();
        if (!element) {
          return null;
        }
        return (
          <div key={card.id} className="w-full">
            {element}
          </div>
        );
      })}
    </div>
  );
}
