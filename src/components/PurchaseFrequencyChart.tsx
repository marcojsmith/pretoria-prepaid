import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

interface MonthlyStat {
  month: string;
  units: number;
  cost: number;
  purchases: number;
}

interface PurchaseFrequencyChartProps {
  stats: MonthlyStat[];
}

export function PurchaseFrequencyChart({ stats }: PurchaseFrequencyChartProps) {
  // Take last 6 months and reverse to chronological order (oldest to newest)
  const displayData = [...stats].slice(0, 6).reverse();

  if (displayData.length === 0) return null;

  const maxPurchases = Math.max(...displayData.map((s) => s.purchases), 1);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider">
            Refill Frequency
          </CardTitle>
        </div>
        <CardDescription className="text-[10px]">Number of purchases per month</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-4">
        <div className="flex h-24 items-end justify-between gap-1">
          {displayData.map((stat, idx) => {
            const height = (stat.purchases / maxPurchases) * 100;
            const date = new Date(stat.month + "-01");
            const monthLabel = date.toLocaleDateString("en-ZA", {
              month: "short",
            });
            const yearLabel = date.getFullYear().toString().slice(-2);

            return (
              <div
                key={idx}
                className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="flex w-full max-w-[24px] cursor-help items-end justify-center rounded-t bg-primary/40 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(height, 5)}%` }}
                >
                  <span className="mb-1 text-[10px] font-bold text-primary">{stat.purchases}</span>

                  <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border bg-popover px-1.5 py-0.5 text-center text-[10px] text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    {stat.purchases} purchases
                    <br />
                    {Math.round(stat.units)} kWh total
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-center">
                  <span className="text-[8px] font-medium text-muted-foreground">{monthLabel}</span>
                  <span className="text-[7px] text-muted-foreground/60">'{yearLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
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
