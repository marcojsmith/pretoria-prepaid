/* eslint-disable llm-core/no-magic-numbers */
import { useEffect, useMemo, useState } from "react";
import { usePurchases } from "@/hooks/usePurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const YEAR_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function getYearsWithData(allMonthlyStats: { month: string }[]): number[] {
  if (!allMonthlyStats || allMonthlyStats.length === 0) return [];
  const years = new Set(allMonthlyStats.map((s) => Number(s.month.split("-")[0])));
  return Array.from(years).sort((a, b) => b - a);
}

function prepareBarData(
  allMonthlyStats: { month: string; units: number }[],
  year: number
): { month: string; avgDaily: number }[] {
  return MONTHS.map((label, i) => {
    const monthKey = `${year}-${(i + 1).toString().padStart(2, "0")}`;
    const stats = allMonthlyStats.find((s) => s.month === monthKey);
    const daysInMonth = new Date(year, i + 1, 0).getDate();
    return { month: label, avgDaily: stats ? stats.units / daysInMonth : 0 };
  });
}

function prepareLineData(
  allMonthlyStats: { month: string; units: number }[],
  years: number[]
): Record<string, string | number>[] {
  return MONTHS.map((label, i) => {
    const row: Record<string, string | number> = { month: label };
    years.forEach((year) => {
      const monthKey = `${year}-${(i + 1).toString().padStart(2, "0")}`;
      const stats = allMonthlyStats.find((s) => s.month === monthKey);
      if (stats) {
        const daysInMonth = new Date(year, i + 1, 0).getDate();
        row[String(year)] = stats.units / daysInMonth;
      }
    });
    return row;
  });
}

export function AverageDailyUsageChart(): JSX.Element {
  const { getMonthlyStats } = usePurchases();
  const allMonthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

  const [chartType, setChartType] = useState<"bar" | "line">(
    () => (localStorage.getItem("avg_daily_chart_type") as "bar" | "line") ?? "bar"
  );
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(
    () => getYearsWithData(allMonthlyStats)[0] ?? currentYear
  );

  const years = useMemo(() => {
    const y = getYearsWithData(allMonthlyStats);
    return y.length > 0 ? y : [currentYear];
  }, [allMonthlyStats, currentYear]);

  useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0] ?? currentYear);
    }
  }, [years, selectedYear, currentYear]);

  const barData = useMemo(
    () => prepareBarData(allMonthlyStats, selectedYear),
    [allMonthlyStats, selectedYear]
  );

  const lineData = useMemo(() => prepareLineData(allMonthlyStats, years), [allMonthlyStats, years]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Average Daily Consumption (kWh/d)
        </CardTitle>
        <div className="flex items-center gap-2">
          {chartType === "bar" && (
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-7 w-[90px] text-xs" aria-label="Select year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-md border">
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-r-none px-2"
              onClick={() => {
                setChartType("bar");
                localStorage.setItem("avg_daily_chart_type", "bar");
              }}
              aria-label="Bar chart"
              aria-pressed={chartType === "bar"}
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={chartType === "line" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-l-none border-l px-2"
              onClick={() => {
                setChartType("line");
                localStorage.setItem("avg_daily_chart_type", "line");
              }}
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
                  formatter={(value: unknown) => [
                    `${(value as number).toFixed(1)} kWh/d`,
                    "Avg Daily",
                  ]}
                />
                <Bar
                  dataKey="avgDaily"
                  fill="hsl(var(--chart-1))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              {selectedYear} — Jan to Dec
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
                  formatter={(value: unknown) => [`${(value as number).toFixed(1)} kWh/d`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {years.map((year, i) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={String(year)}
                    stroke={YEAR_COLORS[i % YEAR_COLORS.length]!}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
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
}
