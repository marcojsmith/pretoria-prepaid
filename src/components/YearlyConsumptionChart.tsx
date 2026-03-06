import { useMemo, useState } from "react";
import { usePurchases } from "@/hooks/usePurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function YearlyConsumptionChart() {
  const { getMonthlyStats } = usePurchases();
  const allMonthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);

    allMonthlyStats.forEach((s) => {
      years.add(s.month.substring(0, 4));
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allMonthlyStats]);

  const [selectedYear, setSelectedYear] = useState(
    availableYears[0] || new Date().getFullYear().toString()
  );

  const yearData = useMemo(() => {
    const data = Array(12)
      .fill(0)
      .map((_, i) => ({
        month: MONTHS[i],
        units: 0,
        monthKey: `${selectedYear}-${(i + 1).toString().padStart(2, "0")}`,
      }));

    allMonthlyStats.forEach((s) => {
      if (s.month.startsWith(selectedYear)) {
        const monthIndex = parseInt(s.month.substring(5, 7)) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          data[monthIndex].units = s.units;
        }
      }
    });

    return data;
  }, [allMonthlyStats, selectedYear]);

  const maxUnits = useMemo(() => {
    const max = Math.max(...yearData.map((d) => d.units));
    return max === 0 ? 100 : max * 1.1; // Add 10% headroom
  }, [yearData]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">Yearly Consumption</CardTitle>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year} className="text-xs">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex h-[180px] justify-between gap-1 pt-4 sm:gap-2">
          {yearData.map((data, index) => {
            const height = (data.units / maxUnits) * 100;
            return (
              <div
                key={data.month}
                className="group relative flex h-full flex-1 flex-col items-center"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground group-hover:block">
                  {data.units.toFixed(1)} kWh
                </div>

                {/* Bar */}
                <div className="relative flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-muted/30">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: index * 0.03 }}
                    className="w-full bg-primary/80 transition-colors group-hover:bg-primary"
                  />
                </div>

                {/* Month Label */}
                <span className="mt-2 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {data.month}
                </span>

                {/* Desktop-only value label */}
                <span className="mt-0.5 hidden h-3 text-[9px] text-muted-foreground/70 lg:block">
                  {data.units > 0 ? `${Math.round(data.units)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
