import { useMemo } from "react";
import { usePurchases } from "@/hooks/usePurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AverageDailyUsageChart() {
  const { getMonthlyStats } = usePurchases();
  const allMonthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

  const rollingData = useMemo(() => {
    const data = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}`;

      const stats = allMonthlyStats.find((s) => s.month === monthKey);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const avgDaily = stats ? stats.units / daysInMonth : 0;

      data.push({
        month: MONTHS[month],
        avgDaily,
        monthKey,
      });
    }

    return data;
  }, [allMonthlyStats]);

  const maxAvg = useMemo(() => {
    const max = Math.max(...rollingData.map((d) => d.avgDaily));
    return max === 0 ? 10 : max * 1.2;
  }, [rollingData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          Average Daily Consumption (kWh/d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[180px] justify-between gap-1 pt-4 sm:gap-2">
          {rollingData.map((data, index) => {
            const height = (data.avgDaily / maxAvg) * 100;
            return (
              <div
                key={data.monthKey}
                className="group relative flex h-full flex-1 flex-col items-center"
              >
                <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground group-hover:block">
                  {data.avgDaily.toFixed(1)} kWh/d
                </div>

                {/* Bar Value (above bar) */}
                {data.avgDaily > 0 && (
                  <span className="mb-1 text-[9px] font-bold text-orange-500">
                    {data.avgDaily.toFixed(1)}
                  </span>
                )}

                <div className="relative flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-muted/30">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: index * 0.03 }}
                    className="w-full bg-orange-500/80 transition-colors group-hover:bg-orange-500"
                  />
                </div>

                <span className="mt-2 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {data.month}
                </span>

                <span className="mt-0.5 hidden h-3 text-[9px] text-muted-foreground/70 lg:block">
                  {data.avgDaily > 0 ? `${data.avgDaily.toFixed(1)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Monthly units / days in month
        </p>
      </CardContent>
    </Card>
  );
}
