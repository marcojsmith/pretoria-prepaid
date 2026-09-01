/* eslint-disable llm-core/no-magic-numbers */
import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MAX_COST_PER_KWH_CHART_ITEMS } from "@/lib/constants";
import { formatCurrency } from "@/lib/electricity";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyStat } from "@/hooks/usePurchaseStats";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

interface AverageCostPerKwhChartProps {
  stats: MonthlyStat[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function prepareChartData(
  stats: MonthlyStat[]
): Array<{ month: string; ratePerKwh: number | null }> {
  return [...stats]
    .slice(0, MAX_COST_PER_KWH_CHART_ITEMS)
    .reverse()
    .map((s) => {
      const [yearStr, monthStr] = s.month.split("-");
      const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      return {
        month: date.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }),
        ratePerKwh: s.units > 0 ? s.cost / s.units : null,
      };
    });
}

/**
 * Memoized line chart showing the blended average cost per kWh per month.
 *
 * @param props - {@link AverageCostPerKwhChartProps}
 * @param props.stats - Array of monthly statistics used to derive chart data via {@link prepareChartData}.
 * @returns A chart card, or null if there is no data.
 */
export const AverageCostPerKwhChart = memo(function AverageCostPerKwhChart({
  stats,
}: AverageCostPerKwhChartProps): JSX.Element | null {
  const chartData = useMemo(() => prepareChartData(stats), [stats]);

  if (chartData.length === 0) return null;

  const current = stats[0];
  const currentRate =
    current && current.units > 0 ? `${formatCurrency(current.cost / current.units)}/kWh` : "—";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Average Cost per kWh</CardTitle>
        </div>
        <CardDescription className="text-[10px]">
          Your blended rate per unit, per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
              cursor={{ stroke: "hsl(var(--accent-foreground) / 0.15)" }}
              formatter={(value) => [`${formatCurrency(Number(value))}/kWh`, "Rate"]}
            />
            <Line
              dataKey="ratePerKwh"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={!prefersReducedMotion}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-between border-t pt-2 text-[9px] text-muted-foreground">
          <span>Older</span>
          <span>
            Current Month: <span className="font-bold text-primary">{currentRate}</span>
          </span>
          <span>Newer</span>
        </div>
      </CardContent>
    </Card>
  );
});
