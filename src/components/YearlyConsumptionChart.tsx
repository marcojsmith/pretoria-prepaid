import { MultiYearChart } from "@/components/MultiYearChart";
import { usePurchases } from "@/hooks/usePurchase";
import { useMemo } from "react";

export function YearlyConsumptionChart(): JSX.Element {
  const { getMonthlyStats } = usePurchases();
  const monthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);
  return (
    <MultiYearChart
      title="Monthly Consumption (kWh)"
      localStorageKey="yearly_consumption_chart_type"
      monthlyStats={monthlyStats}
      mode="monthly-total"
      tooltipUnit="kWh"
      tooltipLabel="Usage"
    />
  );
}
