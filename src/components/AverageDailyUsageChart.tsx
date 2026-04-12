import { MultiYearChart } from "@/components/MultiYearChart";
import { usePurchases } from "@/hooks/usePurchase";
import { useMemo } from "react";

export function AverageDailyUsageChart(): JSX.Element {
  const { getMonthlyStats } = usePurchases();
  const monthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);
  return (
    <MultiYearChart
      title="Average Daily Consumption (kWh/d)"
      localStorageKey="avg_daily_chart_type"
      monthlyStats={monthlyStats}
      mode="daily-average"
      tooltipUnit="kWh/d"
      tooltipLabel="Avg Daily"
    />
  );
}
