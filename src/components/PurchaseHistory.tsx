import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, TIER_BG_CLASSES, TIER_TEXT_CLASSES, roundUnits } from "@/lib/electricity";
import type { Purchase } from "@/lib/electricity";
import { History, Trash2, ChevronDown, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MAX_PURCHASE_HISTORY_ITEMS } from "@/lib/constants";

interface PurchaseHistoryProps {
  purchases: Purchase[];
  onDelete: (id: string) => void;
}

export function PurchaseHistory({ purchases, onDelete }: PurchaseHistoryProps): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(MAX_PURCHASE_HISTORY_ITEMS);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && purchases.length > visibleCount) {
          setVisibleCount((prev) => prev + MAX_PURCHASE_HISTORY_ITEMS);
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
  }, [purchases.length, visibleCount]);

  if (purchases.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-3 w-3 text-primary" />
          Purchase History
        </h2>
        <p className="py-4 text-center text-xs text-muted-foreground">No purchases recorded yet.</p>
      </div>
    );
  }

  const visiblePurchases = purchases.slice(0, visibleCount);
  const hasMore = purchases.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + MAX_PURCHASE_HISTORY_ITEMS);
  };

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-3 w-3 text-primary" />
        Purchase History
        <span className="text-xs font-normal text-muted-foreground">
          ({purchases.length} total)
        </span>
      </h2>

      <div className="space-y-2">
        {visiblePurchases.map((purchase) => {
          const effectiveRate = purchase.amountPaid / purchase.units;
          const hasValidBreakdown =
            purchase.tierBreakdown &&
            purchase.tierBreakdown.length > 0 &&
            typeof purchase.tierBreakdown[0]?.tier === "number";

          return (
            <div
              key={purchase._id}
              className={`space-y-2 rounded-md border p-3 ${
                purchase.isOffline
                  ? "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/30"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex justify-between text-xs">
                <span className="font-medium">
                  {new Date(purchase.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {purchase.isOffline && (
                    <Badge
                      variant="outline"
                      className="ml-2 inline-flex h-4 gap-1 border-amber-300 bg-amber-100/50 px-1 text-[8px] font-normal text-amber-700 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                    >
                      <Clock className="h-2 w-2" />
                      Syncing
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {roundUnits(purchase.units)} kWh • {formatCurrency(purchase.amountPaid)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(purchase._id)}
                    aria-label="Delete purchase"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tier-segmented progress bar */}
              {hasValidBreakdown && (
                <div className="h-1.5 overflow-hidden rounded-md bg-muted">
                  <div className="flex h-full overflow-hidden rounded-md">
                    {purchase.tierBreakdown.map((item) => {
                      const segmentWidth = (item.units / purchase.units) * 100;
                      return (
                        <div
                          key={item.tier}
                          className={`h-full ${TIER_BG_CLASSES[item.tier as keyof typeof TIER_BG_CLASSES] || "bg-primary"}`}
                          style={{ width: `${segmentWidth}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tier breakdown text */}
              <div className="flex flex-wrap gap-x-1.5 text-[10px] text-muted-foreground">
                {hasValidBreakdown &&
                  purchase.tierBreakdown.map((item, index) => (
                    <span key={item.tier}>
                      <span
                        className={`font-medium ${TIER_TEXT_CLASSES[item.tier as keyof typeof TIER_TEXT_CLASSES]}`}
                      >
                        {roundUnits(item.units)}
                      </span>
                      <span> {item.label}</span>
                      {index < purchase.tierBreakdown.length - 1 && <span> •</span>}
                    </span>
                  ))}
                <span className="ml-auto">@ {formatCurrency(effectiveRate)}/kWh</span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
        </div>
      )}

      {/* Fallback button if observer doesn't work or for accessibility */}
      {hasMore && (
        <Button variant="outline" size="sm" className="sr-only w-full" onClick={handleShowMore}>
          <ChevronDown className="mr-1 h-3 w-3" />
          Show More ({purchases.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}
