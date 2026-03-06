import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRates } from "@/hooks/useRates";
import {
  calculateCost,
  formatCurrency,
  TIER_BG_CLASSES,
  TIER_TEXT_CLASSES,
  roundUnits,
  getRemainingTierCapacity,
  ElectricityRate,
} from "@/lib/electricity";
import { Calculator, Lightbulb, Save, Loader2, Zap, AlertTriangle } from "lucide-react";

interface PurchaseCalculatorProps {
  unitsAlreadyBought: number;
  averageMonthlyUsage: number;
  daysLeftInMonth: number;
  onSavePurchase?: (units: number, amount: number, currentBalance?: number) => void;
}

export function PurchaseCalculator({
  unitsAlreadyBought,
  averageMonthlyUsage,
  daysLeftInMonth,
  onSavePurchase,
}: PurchaseCalculatorProps) {
  const { rates, loading: ratesLoading } = useRates();
  const suggestedUnits = useMemo(() => {
    if (averageMonthlyUsage === 0) return 0;
    return Math.max(0, averageMonthlyUsage - unitsAlreadyBought);
  }, [averageMonthlyUsage, unitsAlreadyBought]);

  const [targetUnits, setTargetUnits] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");

  // Pre-populate with suggested units when it becomes available
  useEffect(() => {
    if (suggestedUnits > 0 && targetUnits === "") {
      setTargetUnits(roundUnits(suggestedUnits).toString());
    }
  }, [suggestedUnits, targetUnits]);

  const targetNum = parseFloat(targetUnits) || 0;
  const balanceNum = parseFloat(currentBalance) || 0;

  const tierCapacity = useMemo(() => {
    if (ratesLoading || rates.length === 0) return null;
    return getRemainingTierCapacity(unitsAlreadyBought, rates as ElectricityRate[]);
  }, [unitsAlreadyBought, rates, ratesLoading]);

  const exceedsTier = targetNum > (tierCapacity?.units || 0);
  const costToStayInTier = useMemo(() => {
    if (!exceedsTier || !tierCapacity || tierCapacity.units === Infinity) return 0;
    return tierCapacity.units * tierCapacity.rate;
  }, [exceedsTier, tierCapacity]);

  const calculation = useMemo(() => {
    if (targetNum <= 0 || ratesLoading || rates.length === 0) return null;
    return calculateCost(targetNum, unitsAlreadyBought, rates as ElectricityRate[]);
  }, [targetNum, unitsAlreadyBought, rates, ratesLoading]);

  const handleSavePurchase = () => {
    if (calculation && onSavePurchase) {
      onSavePurchase(targetNum, calculation.total, balanceNum > 0 ? balanceNum : undefined);
    }
  };

  if (ratesLoading) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="balance" className="text-sm">
              Current Meter (kWh)
            </Label>
            <Input
              id="balance"
              type="number"
              step="0.1"
              placeholder="e.g. 15.0"
              value={currentBalance}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentBalance(val);
                const num = parseFloat(val);
                if (!isNaN(num) && averageMonthlyUsage > 0) {
                  const now = new Date();
                  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const daysElapsed = Math.max(1, daysInMonth - daysLeftInMonth);

                  // Consumed units according to this reading.
                  // (Previous reading would be better, but we only have unitsAlreadyBought here)
                  // If we bought 100 units this month, and we have 20 left, we used 80.
                  const estimatedConsumed = Math.max(0, unitsAlreadyBought - num);

                  // Use either estimated burn rate or historical average
                  const burnRate =
                    estimatedConsumed > 0
                      ? estimatedConsumed / daysElapsed
                      : averageMonthlyUsage / daysInMonth;

                  const neededRemaining = burnRate * daysLeftInMonth;
                  // We need 'neededRemaining' for the rest of the month, and we already have 'num'
                  const neededToBuy = Math.max(0, neededRemaining - num);
                  setTargetUnits(roundUnits(neededToBuy).toString());
                } else if (val === "" && suggestedUnits > 0) {
                  setTargetUnits(roundUnits(suggestedUnits).toString());
                }
              }}
              min="0"
              className="h-9"
            />
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
              className="h-9"
            />
          </div>
        </div>

        {exceedsTier &&
          tierCapacity &&
          tierCapacity.units > 0 &&
          tierCapacity.units !== Infinity && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-400">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Tier Limit Warning
              </div>
              <p className="mt-1">
                Buying more than <strong>{roundUnits(tierCapacity.units)} kWh</strong> will push you
                into the next, more expensive tier.
              </p>
              <p className="mt-1">
                Spend <strong>{formatCurrency(costToStayInTier)}</strong> to stay within{" "}
                <strong>{tierCapacity.label}</strong>.
              </p>
            </div>
          )}

        {targetNum > 0 && balanceNum > 0 && (
          <div className="rounded-md bg-primary/5 p-2 text-center">
            <p className="text-xs text-muted-foreground">Estimated New Balance</p>
            <p className="flex items-center justify-center gap-2 text-lg font-bold text-primary">
              <Zap className="h-4 w-4" />
              {roundUnits(targetNum + balanceNum)} kWh
            </p>
          </div>
        )}

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
