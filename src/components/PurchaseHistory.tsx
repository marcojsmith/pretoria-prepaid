import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Purchase,
  formatCurrency,
  TIER_BG_CLASSES,
  TIER_TEXT_CLASSES,
  roundUnits,
} from "@/lib/electricity";
import { History, Trash2, ChevronDown } from "lucide-react";
interface PurchaseHistoryProps {
  purchases: Purchase[];
  onDelete: (id: string) => void;
}
export function PurchaseHistory({ purchases, onDelete }: PurchaseHistoryProps) {
  const [visibleCount, setVisibleCount] = useState(10);
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
    setVisibleCount((prev) => prev + 10);
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
            typeof purchase.tierBreakdown[0].tier === "number";
          return (
            <div
              key={purchase.id}
              className="space-y-1.5 rounded-md border border-border bg-secondary-foreground p-2.5"
            >
              {/* Header row with date top-right */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{roundUnits(purchase.units)} kWh</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(purchase.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Amount and delete */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  {formatCurrency(purchase.amountPaid)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(purchase.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Tier breakdown */}
              {hasValidBreakdown && (
                <div className="space-y-1">
                  {/* Visual bar */}
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {purchase.tierBreakdown.map((item) => {
                      const percentage = (item.units / purchase.units) * 100;
                      return (
                        <div
                          key={item.tier}
                          className={`h-full ${TIER_BG_CLASSES[item.tier as keyof typeof TIER_BG_CLASSES]}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Text breakdown */}
                  <div className="flex flex-wrap gap-x-1.5 text-[10px]">
                    {purchase.tierBreakdown.map((item, index) => (
                      <span key={item.tier}>
                        <span
                          className={TIER_TEXT_CLASSES[item.tier as keyof typeof TIER_TEXT_CLASSES]}
                        >
                          {roundUnits(item.units)} {item.label}
                        </span>
                        {index < purchase.tierBreakdown.length - 1 && (
                          <span className="text-muted-foreground"> + </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                @ {formatCurrency(effectiveRate)}/kWh effective
              </p>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleShowMore}>
          <ChevronDown className="mr-1 h-3 w-3" />
          Show More ({purchases.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}
