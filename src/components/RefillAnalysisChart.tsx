import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { RefillInterval } from "@/lib/electricity";
import { History } from "lucide-react";
import { MAX_REFILL_ANALYSIS_ITEMS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

const CHART_HEIGHT = 140;
const MARGIN_TOP = 8;
const MARGIN_RIGHT = 8;
const MARGIN_LEFT = -20;
const MARGIN_BOTTOM = 0;
const CHART_MARGIN = {
  top: MARGIN_TOP,
  right: MARGIN_RIGHT,
  left: MARGIN_LEFT,
  bottom: MARGIN_BOTTOM,
} as const;
const AXIS_TICK_FONT_SIZE = 9;
const XAXIS_ANGLE = -35;
const XAXIS_HEIGHT = 36;
const TOOLTIP_FONT_SIZE = 11;
const TOOLTIP_BORDER_RADIUS = 6;
const BAR_CORNER_RADIUS = 3;
const BAR_RADIUS: [number, number, number, number] = [BAR_CORNER_RADIUS, BAR_CORNER_RADIUS, 0, 0];
const BAR_MAX_SIZE = 28;

interface RefillAnalysisChartProps {
  intervals: RefillInterval[];
}

type ChartDatum = { date: string; days: number; units: number };

function hasValidDays(i: RefillInterval): i is RefillInterval & { daysSinceLastRefill: number } {
  return i.daysSinceLastRefill !== null;
}

/**
 * Transforms raw refill intervals into chart-ready data points.
 * Filters out entries where `daysSinceLastRefill` is null (i.e. the first
 * purchase with no prior reference), then limits to the last
 * `MAX_REFILL_ANALYSIS_ITEMS` entries so the chart stays readable.
 *
 * @param intervals - Refill interval records from purchase history
 * @returns Array of `ChartDatum` objects (`{ date, days, units }`) ready for recharts
 */
function prepareChartData(intervals: RefillInterval[]): ChartDatum[] {
  return intervals
    .filter(hasValidDays)
    .slice(-MAX_REFILL_ANALYSIS_ITEMS)
    .map((i) => ({
      date: new Date(i.date + "T00:00:00").toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
      }),
      days: i.daysSinceLastRefill,
      units: i.units,
    }));
}

/**
 * Bar chart displaying the number of days between recent electricity refills.
 *
 * Returns `null` when every interval has `daysSinceLastRefill === null`
 * (i.e. there is only one purchase and no gap can be computed).
 *
 * @param props.intervals - Refill interval data derived from purchase history
 */
export const RefillAnalysisChart = memo(function RefillAnalysisChart({
  intervals,
}: RefillAnalysisChartProps): JSX.Element | null {
  const chartData = useMemo(() => prepareChartData(intervals), [intervals]);
  const avgDays = useMemo(
    () =>
      chartData.length > 0
        ? Math.round(chartData.reduce((acc, curr) => acc + curr.days, 0) / chartData.length)
        : 0,
    [chartData]
  );

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Refill Frequency</CardTitle>
        </div>
        <CardDescription className="text-[10px]">Days between recent purchases</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: AXIS_TICK_FONT_SIZE }}
              tickLine={false}
              axisLine={false}
              angle={XAXIS_ANGLE}
              textAnchor="end"
              height={XAXIS_HEIGHT}
            />
            <YAxis tick={{ fontSize: AXIS_TICK_FONT_SIZE }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: TOOLTIP_FONT_SIZE, borderRadius: TOOLTIP_BORDER_RADIUS }}
              cursor={{ fill: "hsl(var(--accent-foreground) / 0.15)" }}
              formatter={(value) => [value, "Days"]}
            />
            <Bar
              dataKey="days"
              fill="hsl(var(--primary))"
              radius={BAR_RADIUS}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={!prefersReducedMotion}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 flex items-center justify-between border-t pt-2 text-[9px] text-muted-foreground">
          <span>Older</span>
          <span>Average: {avgDays} days</span>
          <span>Newer</span>
        </div>
      </CardContent>
    </Card>
  );
});
