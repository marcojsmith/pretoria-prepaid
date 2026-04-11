/* eslint-disable llm-core/no-magic-numbers */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { RefillInterval } from "@/lib/electricity";
import { History } from "lucide-react";
import { MAX_REFILL_ANALYSIS_ITEMS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RefillAnalysisChartProps {
  intervals: RefillInterval[];
}

function prepareChartData(intervals: RefillInterval[]) {
  return intervals
    .filter((i) => i.daysSinceLastRefill !== null)
    .slice(-MAX_REFILL_ANALYSIS_ITEMS)
    .map((i) => ({
      date: new Date(i.date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }),
      days: i.daysSinceLastRefill ?? 0,
      units: i.units,
    }));
}

export function RefillAnalysisChart({ intervals }: RefillAnalysisChartProps): JSX.Element | null {
  const chartData = prepareChartData(intervals);

  if (chartData.length === 0) {
    return null;
  }

  const avgDays = Math.round(
    chartData.reduce((acc, curr) => acc + curr.days, 0) / chartData.length
  );

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
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              height={36}
            />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
              formatter={(value) => [value, "Days"]}
            />
            <Bar dataKey="days" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={28} />
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
}
