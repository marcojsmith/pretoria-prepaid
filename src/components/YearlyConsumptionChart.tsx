import { useMemo } from "react";
import { usePurchases } from "@/hooks/usePurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function YearlyConsumptionChart() {
  const { getMonthlyStats } = usePurchases();
  const allMonthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

  const rollingData = useMemo(() => {
    const data = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Generate last 12 months (including current)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}`;

      const stats = allMonthlyStats.find((s) => s.month === monthKey);
      data.push({
        month: MONTHS[month],
        units: stats?.units || 0,
        monthKey,
      });
    }

    return data;
  }, [allMonthlyStats]);

  const maxUnits = useMemo(() => {
    const max = Math.max(...rollingData.map((d) => d.units));
    return max === 0 ? 100 : max * 1.1; // Add 10% headroom
  }, [rollingData]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Monthly Consumption (kWh)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-[180px] justify-between gap-1 pt-4 sm:gap-2"
          role="img"
          aria-label={`Yearly consumption chart showing the last 12 rolling months of electricity usage in kWh. Peak consumption was ${Math.round(
            maxUnits / 1.1
          )} kWh.`}
        >
          {rollingData.map((data, index) => {
            const height = (data.units / maxUnits) * 100;
            return (
              <div
                key={data.monthKey}
                className="group relative flex h-full flex-1 flex-col items-center"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground group-hover:block">
                  {data.units.toFixed(1)} kWh
                </div>
                {/* Bar Value (above bar) */}
                {data.units > 0 && (
                  <span className="mb-1 text-[11px] font-bold text-primary" aria-hidden="true">
                    {Math.round(data.units)}
                  </span>
                )}
                {/* Bar */}
                <div
                  className="relative flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-muted/30"
                  aria-label={`${data.month}: ${data.units.toFixed(1)} kWh`}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: index * 0.03 }}
                    className="w-full bg-primary/80 transition-colors group-hover:bg-primary"
                  />
                </div>
                {/* Month Label */}
                <span
                  className="mt-2 text-[10px] font-medium text-muted-foreground sm:text-[11px]"
                  aria-hidden="true"
                >
                  {data.month}
                </span>
                <span
                  className="mt-0.5 hidden h-3 text-[9px] text-muted-foreground/70 lg:block"
                  aria-hidden="true"
                >
                  {data.units > 0 ? `${Math.round(data.units)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">Last 12 rolling months</p>
      </CardContent>
    </Card>
  );
}
