import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefillInterval } from "@/lib/electricity";
import { History } from "lucide-react";

interface RefillAnalysisChartProps {
  intervals: RefillInterval[];
}

export function RefillAnalysisChart({ intervals }: RefillAnalysisChartProps) {
  // Filter out the first entry (null interval) and take the last 7
  const displayData = intervals.filter((i) => i.daysSinceLastRefill !== null).slice(-7);

  if (displayData.length === 0) {
    return null;
  }

  const maxDays = Math.max(...displayData.map((i) => i.daysSinceLastRefill || 0), 1);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider">
            Refill Frequency
          </CardTitle>
        </div>
        <CardDescription className="text-[10px]">Days between recent purchases</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-4">
        <div className="flex h-20 items-end justify-between gap-1">
          {displayData.map((interval, idx) => {
            // Ensure at least 10% height for visibility if days is > 0
            const rawHeight = ((interval.daysSinceLastRefill || 0) / maxDays) * 100;
            const height = interval.daysSinceLastRefill === 0 ? 5 : Math.max(rawHeight, 10);

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
        <div className="mt-6 flex items-center justify-between border-t pt-2 text-[9px] text-muted-foreground">
          <span>Older</span>
          <span>
            Average:{" "}
            {Math.round(
              displayData.reduce((acc, curr) => acc + (curr.daysSinceLastRefill || 0), 0) /
                displayData.length
            )}{" "}
            days
          </span>
          <span>Newer</span>
        </div>
      </CardContent>
    </Card>
  );
}
