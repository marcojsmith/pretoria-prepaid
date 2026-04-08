import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { RefillInterval } from "@/lib/electricity";
import { History } from "lucide-react";
import { MAX_REFILL_ANALYSIS_ITEMS, MIN_CHART_BAR_PERCENT, MIN_CHART_VALUE } from "@/lib/constants";

interface RefillAnalysisChartProps {
  intervals: RefillInterval[];
}

export function RefillAnalysisChart({ intervals }: RefillAnalysisChartProps): JSX.Element | null {
  const displayData = intervals
    .filter((i) => i.daysSinceLastRefill !== null)
    .slice(-MAX_REFILL_ANALYSIS_ITEMS);

  if (displayData.length === 0) {
    return null;
  }

  const maxDays = Math.max(...displayData.map((i) => i.daysSinceLastRefill || 0), 1);
  const avgDays = Math.round(
    displayData.reduce((acc, curr) => acc + (curr.daysSinceLastRefill || 0), 0) / displayData.length
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
        <RefillChartBars displayData={displayData} maxDays={maxDays} />
        <div className="mt-6 flex items-center justify-between border-t pt-2 text-[9px] text-muted-foreground">
          <span>Older</span>
          <span>Average: {avgDays} days</span>
          <span>Newer</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RefillChartBars({
  displayData,
  maxDays,
}: {
  displayData: { daysSinceLastRefill: number | null; units: number; date: string }[];
  maxDays: number;
}) {
  return (
    <div className="flex h-20 items-end justify-between gap-1">
      {displayData.map((interval, idx) => {
        const rawHeight = ((interval.daysSinceLastRefill || 0) / maxDays) * 100;
        const height =
          interval.daysSinceLastRefill === 0
            ? MIN_CHART_BAR_PERCENT
            : Math.max(rawHeight, MIN_CHART_VALUE);

        const date = new Date(interval.date).toLocaleDateString("en-ZA", {
          day: "2-digit",
          month: "short",
        });

        return (
          <button
            key={idx}
            className="group relative flex h-full flex-1 appearance-none flex-col items-center justify-end gap-1 border-none bg-transparent p-0 outline-none"
            aria-label={`Refill on ${date}: ${interval.daysSinceLastRefill} days after previous, ${interval.units} kWh`}
          >
            <div
              className="flex w-full max-w-[20px] cursor-help items-end justify-center rounded-t bg-primary/40 transition-colors group-hover:bg-primary group-focus:bg-primary"
              style={{ height: `${height}%` }}
            >
              <span className="mb-1 text-[8px] font-bold text-primary group-hover:text-primary-foreground group-focus:text-primary-foreground">
                {interval.daysSinceLastRefill}
              </span>

              <div
                role="tooltip"
                className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border bg-popover px-1.5 py-0.5 text-center text-[10px] text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {interval.daysSinceLastRefill} days
                <br />
                {interval.units} kWh
              </div>
            </div>
            <span className="mt-1 origin-left rotate-45 text-[8px] text-muted-foreground">
              {date}
            </span>
          </button>
        );
      })}
    </div>
  );
}
