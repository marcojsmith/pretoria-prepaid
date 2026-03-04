import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  calculateCost,
  formatCurrency,
  TIER_BG_CLASSES,
  TIER_TEXT_CLASSES,
  roundUnits,
} from "@/lib/electricity";
import { Calculator, Lightbulb, Save } from "lucide-react";
interface PurchaseCalculatorProps {
  unitsAlreadyBought: number;
  averageMonthlyUsage: number;
  daysLeftInMonth: number;
  onSavePurchase?: (units: number, amount: number) => void;
}
export function PurchaseCalculator({
  unitsAlreadyBought,
  averageMonthlyUsage,
  daysLeftInMonth,
  onSavePurchase,
}: PurchaseCalculatorProps) {
  const suggestedUnits = useMemo(() => {
    if (averageMonthlyUsage === 0) return 0;
    return Math.max(0, averageMonthlyUsage - unitsAlreadyBought);
  }, [averageMonthlyUsage, unitsAlreadyBought]);
  const [targetUnits, setTargetUnits] = useState("");

  // Pre-populate with suggested units when it becomes available
  useEffect(() => {
    if (suggestedUnits > 0 && targetUnits === "") {
      setTargetUnits(roundUnits(suggestedUnits).toString());
    }
  }, [suggestedUnits]);
  const targetNum = parseFloat(targetUnits) || 0;
  const calculation = useMemo(() => {
    if (targetNum <= 0) return null;
    return calculateCost(targetNum, unitsAlreadyBought);
  }, [targetNum, unitsAlreadyBought]);
  const handleSavePurchase = () => {
    if (calculation && onSavePurchase) {
      onSavePurchase(targetNum, calculation.total);
    }
  };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Smart Calculator
        </CardTitle>
        <CardDescription className="text-xs">
          See how your purchase will be priced across tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 rounded-lg border bg-background p-3 text-sm">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-medium">Current Position</span>
          </div>
          <p className="text-muted-foreground">
            You've bought <strong>{roundUnits(unitsAlreadyBought)} kWh</strong> this month.
          </p>
          {suggestedUnits > 0 && (
            <p className="text-muted-foreground">
              Based on <strong>{roundUnits(averageMonthlyUsage)} kWh/month</strong> avg, you need{" "}
              <strong>{roundUnits(suggestedUnits)} more kWh</strong>.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{daysLeftInMonth} days left this month</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target" className="text-sm">
            kWh to buy
          </Label>
          <Input
            id="target"
            type="number"
            step="0.1"
            placeholder={suggestedUnits > 0 ? roundUnits(suggestedUnits).toString() : "Enter kWh"}
            value={targetUnits}
            onChange={(e) => setTargetUnits(e.target.value)}
            min="0.1"
          />
        </div>

        {calculation && calculation.breakdown.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Price Breakdown</div>

            {/* Visual tier bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {calculation.breakdown.map((item) => {
                const percentage = (item.units / targetNum) * 100;
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

            {/* Breakdown details */}
            <div className="space-y-2">
              {calculation.breakdown.map((item) => (
                <div key={item.tier} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${TIER_BG_CLASSES[item.tier as keyof typeof TIER_BG_CLASSES]}`}
                    />
                    <span
                      className={TIER_TEXT_CLASSES[item.tier as keyof typeof TIER_TEXT_CLASSES]}
                    >
                      {item.label}
                    </span>
                    <span className="text-muted-foreground">
                      {roundUnits(item.units)} kWh @ {formatCurrency(item.rate)}/kWh
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.cost)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total Cost</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(calculation.total)}
              </span>
            </div>

            {/* Effective rate */}
            <div className="text-center text-xs text-muted-foreground">
              Effective rate: {formatCurrency(calculation.total / targetNum)}/kWh
            </div>

            {/* Save as Purchase button */}
            {onSavePurchase && (
              <Button variant="outline" className="w-full" onClick={handleSavePurchase}>
                <Save className="mr-2 h-4 w-4" />
                Save as Purchase
              </Button>
            )}
          </div>
        )}

        {targetNum <= 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Enter kWh to see the price breakdown.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
