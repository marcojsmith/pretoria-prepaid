/* eslint-disable llm-core/no-magic-numbers */
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { debounce } from "@/lib/debounce";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BAR_CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

interface MultiYearChartProps {
  title: string;
  localStorageKey: string;
  monthlyStats: MonthlyStat[];
  mode: "daily-average" | "monthly-total";
  tooltipUnit: string;
  tooltipLabel: string;
}

function getYearsWithData(allMonthlyStats: { month: string }[]): number[] {
  if (!allMonthlyStats || allMonthlyStats.length === 0) return [];
  const years = new Set(allMonthlyStats.map((s) => Number(s.month.split("-")[0])));
  return Array.from(years).sort((a, b) => b - a);
}

function prepareBarData(options: {
  allMonthlyStats: { month: string; units: number }[];
  compareYears: number[];
  mode: "daily-average" | "monthly-total";
}): Record<string, string | number>[] {
  const { allMonthlyStats, compareYears, mode } = options;
  return MONTHS.map((label, i) => {
    const row: Record<string, string | number> = { month: label };
    compareYears.forEach((year) => {
      const monthKey = `${year}-${(i + 1).toString().padStart(2, "0")}`;
      const stats = allMonthlyStats.find((s) => s.month === monthKey);
      if (stats) {
        if (mode === "daily-average") {
          const daysInMonth = new Date(year, i + 1, 0).getDate();
          row[String(year)] = stats.units / daysInMonth;
        } else {
          row[String(year)] = stats.units;
        }
      } else {
        row[String(year)] = 0;
      }
    });
    return row;
  });
}

function prepareLineData(options: {
  allMonthlyStats: { month: string; units: number }[];
  years: number[];
  mode: "daily-average" | "monthly-total";
}): Record<string, string | number>[] {
  const { allMonthlyStats, years, mode } = options;
  return MONTHS.map((label, i) => {
    const row: Record<string, string | number> = { month: label };
    years.forEach((year) => {
      const monthKey = `${year}-${(i + 1).toString().padStart(2, "0")}`;
      const stats = allMonthlyStats.find((s) => s.month === monthKey);
      if (stats) {
        if (mode === "daily-average") {
          const daysInMonth = new Date(year, i + 1, 0).getDate();
          row[String(year)] = stats.units / daysInMonth;
        } else {
          row[String(year)] = stats.units;
        }
      }
    });
    return row;
  });
}

const debouncedSetStorage = debounce((key: string, value: string) => {
  localStorage.setItem(key, value);
}, 300);

export const MultiYearChart = React.memo(function MultiYearChart(
  props: MultiYearChartProps
): JSX.Element {
  const { title, localStorageKey, monthlyStats, mode, tooltipUnit, tooltipLabel } = props;

  const [chartType, setChartType] = useState<"bar" | "line">(
    () => (localStorage.getItem(localStorageKey) as "bar" | "line") ?? "bar"
  );
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const y = getYearsWithData(monthlyStats);
    return y.length > 0 ? y : [currentYear];
  }, [monthlyStats, currentYear]);

  const compareYears = useMemo(() => years.slice(0, 3), [years]);

  const barData = useMemo(
    () => prepareBarData({ allMonthlyStats: monthlyStats, compareYears, mode }),
    [monthlyStats, compareYears, mode]
  );

  const lineData = useMemo(
    () => prepareLineData({ allMonthlyStats: monthlyStats, years, mode }),
    [monthlyStats, years, mode]
  );

  const handleBarClick = () => {
    setChartType("bar");
    debouncedSetStorage(localStorageKey, "bar");
  };

  const handleLineClick = () => {
    setChartType("line");
    debouncedSetStorage(localStorageKey, "line");
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-r-none px-2"
              onClick={handleBarClick}
              aria-label="Bar chart"
              aria-pressed={chartType === "bar"}
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={chartType === "line" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-l-none border-l px-2"
              onClick={handleLineClick}
              aria-label="Line chart"
              aria-pressed={chartType === "line"}
            >
              <TrendingUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartType === "bar" ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  cursor={{ fill: "hsl(var(--accent-foreground) / 0.15)" }}
                  formatter={(value: unknown) => [
                    `${(value as number).toFixed(1)} ${tooltipUnit}`,
                    tooltipLabel,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {compareYears.map((year, i) => (
                  <Bar
                    key={year}
                    dataKey={String(year)}
                    fill={BAR_CHART_COLORS[i % BAR_CHART_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                    isAnimationActive={!prefersReducedMotion}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              Last {compareYears.length} year{compareYears.length !== 1 ? "s" : ""} — Jan to Dec
            </p>
          </>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  cursor={{ fill: "hsl(var(--accent-foreground) / 0.15)" }}
                  formatter={(value: unknown) => [
                    `${(value as number).toFixed(1)} ${tooltipUnit}`,
                    "",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {years.map((year, i) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={String(year)}
                    stroke={BAR_CHART_COLORS[i % BAR_CHART_COLORS.length]!}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    isAnimationActive={!prefersReducedMotion}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              All years — Jan to Dec
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
});
