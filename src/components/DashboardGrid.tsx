import { memo, useMemo, lazy, Suspense } from "react";
import { ConsumptionStatsCard } from "@/components/ConsumptionStatsCard";
import { DashboardStats } from "@/components/DashboardStats";
import { TierProgress } from "@/components/TierProgress";
import { MonthlyStats } from "@/components/MonthlyStats";
import type { CardConfig } from "@/hooks/useDashboardLayout";
import type { ConsumptionStats } from "@/hooks/useConsumption";

const YearlyConsumptionChart = lazy(() =>
  import("@/components/YearlyConsumptionChart").then((m) => ({ default: m.YearlyConsumptionChart }))
);
const AverageDailyUsageChart = lazy(() =>
  import("@/components/AverageDailyUsageChart").then((m) => ({ default: m.AverageDailyUsageChart }))
);
const PurchaseFrequencyChart = lazy(() =>
  import("@/components/PurchaseFrequencyChart").then((m) => ({ default: m.PurchaseFrequencyChart }))
);
const AverageCostPerKwhChart = lazy(() =>
  import("@/components/AverageCostPerKwhChart").then((m) => ({
    default: m.AverageCostPerKwhChart,
  }))
);

const ChartSkeleton = () => <div className="h-[240px] w-full animate-pulse rounded-lg bg-muted" />;

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
  onUpdateBalance: (value: number) => Promise<void>;
}

type CardRenderer = () => JSX.Element | null;

export const DashboardGrid = memo(function DashboardGrid({
  cards,
  consumptionStats,
  unitsThisMonth,
  costThisMonth,
  averageMonthlyUsage,
  averageMonthlyCost,
  monthlyStats,
  onUpdateBalance,
}: DashboardGridProps): JSX.Element {
  const hasHistory = monthlyStats.length > 0;

  const renderers: Record<string, CardRenderer> = useMemo(
    () => ({
      "consumption-stats": () => (
        <ConsumptionStatsCard
          stats={consumptionStats}
          unitsThisMonth={unitsThisMonth}
          costThisMonth={costThisMonth}
          onUpdateBalance={onUpdateBalance}
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
        hasHistory ? (
          <MonthlyStats stats={monthlyStats} averageUsage={averageMonthlyUsage} />
        ) : null,
      "yearly-chart": () =>
        hasHistory ? (
          <Suspense fallback={<ChartSkeleton />}>
            <YearlyConsumptionChart />
          </Suspense>
        ) : null,
      "daily-chart": () =>
        hasHistory ? (
          <Suspense fallback={<ChartSkeleton />}>
            <AverageDailyUsageChart />
          </Suspense>
        ) : null,
      "frequency-chart": () =>
        hasHistory ? (
          <Suspense fallback={<ChartSkeleton />}>
            <PurchaseFrequencyChart stats={monthlyStats} />
          </Suspense>
        ) : null,
      "cost-per-kwh-chart": () =>
        hasHistory ? (
          <Suspense fallback={<ChartSkeleton />}>
            <AverageCostPerKwhChart stats={monthlyStats} />
          </Suspense>
        ) : null,
    }),
    [
      consumptionStats,
      unitsThisMonth,
      costThisMonth,
      averageMonthlyUsage,
      averageMonthlyCost,
      monthlyStats,
      hasHistory,
      onUpdateBalance,
    ]
  );

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
});
