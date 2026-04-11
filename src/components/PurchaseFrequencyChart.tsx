/* eslint-disable llm-core/no-magic-numbers */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import { MAX_PURCHASE_FREQUENCY_ITEMS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

interface PurchaseFrequencyChartProps {
  stats: MonthlyStat[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function prepareChartData(
  stats: MonthlyStat[]
): Array<{ month: string; purchases: number; units: number }> {
  return [...stats]
    .slice(0, MAX_PURCHASE_FREQUENCY_ITEMS)
    .reverse()
    .map((s) => {
      const [yearStr, monthStr] = s.month.split("-");
      const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      return {
        month: date.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }),
        purchases: s.purchases,
        units: Math.round(s.units),
      };
    });
}

export function PurchaseFrequencyChart({ stats }: PurchaseFrequencyChartProps): JSX.Element | null {
  const chartData = prepareChartData(stats);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Refill Frequency</CardTitle>
        </div>
        <CardDescription className="text-[10px]">Number of purchases per month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
              formatter={(value) => [value, "Purchases"]}
            />
            <Bar
              dataKey="purchases"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-between border-t pt-2 text-[9px] text-muted-foreground">
          <span>Older</span>
          <span>
            Current Month:{" "}
            <span className="font-bold text-primary">{stats[0]?.purchases || 0}</span>
          </span>
          <span>Newer</span>
        </div>
      </CardContent>
    </Card>
  );
}
