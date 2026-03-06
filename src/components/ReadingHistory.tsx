import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Trash2, Loader2, ChevronDown } from "lucide-react";
import { roundUnits } from "@/lib/electricity";
import { Id } from "../../convex/_generated/dataModel";

interface Reading {
  _id: Id<"meter_readings">;
  date: string;
  reading: number;
}

interface ReadingHistoryProps {
  readings: Reading[];
  onDelete: (id: Id<"meter_readings">) => void;
  isFiltered?: boolean;
}

export function ReadingHistory({ readings, onDelete, isFiltered }: ReadingHistoryProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && readings.length > visibleCount) {
          setVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [readings.length, visibleCount]);

  if (readings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Activity className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-xs">
            {isFiltered ? "No readings match your filters." : "No readings logged yet."}
          </p>
          <p className="text-[10px]">
            {isFiltered
              ? "Try adjusting your filters or reset them."
              : "Log your first meter reading to start tracking usage."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleReadings = readings.slice(0, visibleCount);
  const hasMore = readings.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Reading History
        {isFiltered && <span className="ml-2 font-normal lowercase"> (filtered)</span>}
        <span className="ml-1 text-xs font-normal">({readings.length} total)</span>
      </h3>

      <div className="space-y-2">
        {visibleReadings.map((reading) => (
          <Card key={reading._id} className="overflow-hidden">
            <CardContent className="flex items-center justify-between p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">{roundUnits(reading.reading)} kWh</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(reading.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(reading._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
        </div>
      )}

      {/* Fallback button for accessibility */}
      {hasMore && (
        <Button variant="outline" size="sm" className="sr-only w-full" onClick={handleShowMore}>
          <ChevronDown className="mr-1 h-3 w-3" />
          Show More ({readings.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}
