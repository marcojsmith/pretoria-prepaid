import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Trash2, Loader2, ChevronDown } from "lucide-react";
import { roundUnits } from "@/lib/electricity";
import type { Id } from "../../convex/_generated/dataModel";
import { MAX_READING_HISTORY_ITEMS } from "@/lib/constants";

interface Reading {
  _id: Id<"meter_readings">;
  date: string;
  readingPre: number;
  readingPost: number;
  source: "purchase" | "onboarding";
}

interface ReadingHistoryProps {
  readings: Reading[];
  onDelete: (id: Id<"meter_readings">) => void;
  isFiltered?: boolean;
}

interface ReadingCardProps {
  reading: Reading;
  onDelete: (id: Id<"meter_readings">) => void;
}

function parseLocalDate(d: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(d);
}

function ReadingCard({ reading, onDelete }: ReadingCardProps) {
  return (
    <Card key={reading._id} className="overflow-hidden">
      <CardContent className="flex items-center justify-between pt-4">
        <div className="space-y-0.5">
          {reading.source === "onboarding" ? (
            <>
              <p className="text-sm font-bold">{roundUnits(reading.readingPost)} kWh</p>
              <p className="text-[10px] text-muted-foreground">Starting point</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">
                {roundUnits(reading.readingPre)} kWh → {roundUnits(reading.readingPost)} kWh
              </p>
              <p className="text-[10px] text-muted-foreground">
                {roundUnits(reading.readingPost - reading.readingPre)} units purchased
              </p>
            </>
          )}
          <p className="text-[10px] text-muted-foreground">
            {parseLocalDate(reading.date).toLocaleDateString("en-ZA", {
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
          aria-label="Delete reading"
          onClick={() => onDelete(reading._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ReadingHistory({
  readings,
  onDelete,
  isFiltered,
}: ReadingHistoryProps): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(MAX_READING_HISTORY_ITEMS);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && readings.length > visibleCount) {
          setVisibleCount((prev) => prev + MAX_READING_HISTORY_ITEMS);
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [readings.length, visibleCount]);

  if (readings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
          <Activity className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-xs">
            {isFiltered ? "No readings match your filters." : "No readings logged yet."}
          </p>
          <p className="text-[10px]">
            {isFiltered
              ? "Try adjusting your filters or reset them."
              : "Log your first purchase to start tracking usage."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleReadings = readings.slice(0, visibleCount);
  const hasMore = readings.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + MAX_READING_HISTORY_ITEMS);
  };

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-sm font-semibold text-muted-foreground">
        Reading History
        {isFiltered && <span className="ml-2 font-normal lowercase"> (filtered)</span>}
        <span className="ml-1 text-xs font-normal">({readings.length} total)</span>
      </h3>

      <div className="space-y-2">
        {visibleReadings.map((reading) => (
          <ReadingCard key={reading._id} reading={reading} onDelete={onDelete} />
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
