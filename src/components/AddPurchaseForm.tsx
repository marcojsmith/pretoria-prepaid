import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRates } from "@/hooks/useRates";
import {
  formatCurrency,
  roundUnits,
  roundCurrency,
  getRemainingTierCapacity,
  getTierLabel,
  ElectricityRate,
} from "@/lib/electricity";
import { Plus, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AddPurchaseFormProps {
  unitsAlreadyBought: number;
  onAdd: (units: number, amountPaid: number, date: string, meterReading: number) => void;
  prefillAmount?: number | undefined;
  prefillUnits?: number | undefined;
  prefillReading?: number | undefined;
}

export function AddPurchaseForm({
  unitsAlreadyBought,
  onAdd,
  prefillAmount,
  prefillUnits,
  prefillReading,
}: AddPurchaseFormProps) {
  const { rates, loading: ratesLoading } = useRates();
  const [amountPaid, setAmountPaid] = useState("");
  const [unitsReceived, setUnitsReceived] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Pre-fill values when provided
  useEffect(() => {
    if (prefillAmount && prefillAmount > 0) {
      setAmountPaid(roundCurrency(prefillAmount).toString());
    }
    if (prefillUnits && prefillUnits > 0) {
      setUnitsReceived(roundUnits(prefillUnits).toString());
    }
    if (prefillReading && prefillReading > 0) {
      setMeterReading(roundUnits(prefillReading).toString());
    }
  }, [prefillAmount, prefillUnits, prefillReading]);

  const amountNum = parseFloat(amountPaid) || 0;
  const unitsNum = parseFloat(unitsReceived) || 0;
  const readingNum = parseFloat(meterReading) || 0;
  const effectiveRate = unitsNum > 0 ? amountNum / unitsNum : 0;

  const tierCapacity = useMemo(() => {
    if (ratesLoading || rates.length === 0) return null;
    return getRemainingTierCapacity(unitsAlreadyBought, rates as ElectricityRate[]);
  }, [unitsAlreadyBought, rates, ratesLoading]);

  const exceedsTier = unitsNum > (tierCapacity?.units || 0);

  const currentTier = useMemo(() => {
    if (ratesLoading || rates.length === 0) return "Loading...";
    return getTierLabel(unitsAlreadyBought + unitsNum, rates as ElectricityRate[]);
  }, [unitsAlreadyBought, unitsNum, rates, ratesLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum <= 0) {
      toast.error("Please enter a valid amount paid");
      return;
    }
    if (unitsNum <= 0) {
      toast.error("Please enter the kWh received");
      return;
    }
    if (readingNum <= 0) {
      toast.error("Please enter the current meter reading");
      return;
    }
    onAdd(unitsNum, amountNum, date, readingNum);
    setAmountPaid("");
    setUnitsReceived("");
    setMeterReading("");
    toast.success(`Added ${roundUnits(unitsNum)} kWh for ${formatCurrency(amountNum)}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plus className="h-3 w-3 text-primary" />
          Record Purchase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium">
                Amount Paid (R)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="R 500.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                min="0.01"
                step="0.01"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="units" className="text-xs font-medium">
                kWh Received
              </Label>
              <Input
                id="units"
                type="number"
                placeholder="e.g. 120.5"
                value={unitsReceived}
                onChange={(e) => setUnitsReceived(e.target.value)}
                min="0.1"
                step="0.1"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs font-medium">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meterReading" className="text-xs font-medium">
                Current Meter
              </Label>
              <Input
                id="meterReading"
                type="number"
                placeholder="e.g. 1234.5"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                min="0.1"
                step="0.1"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {exceedsTier &&
            tierCapacity &&
            tierCapacity.units > 0 &&
            tierCapacity.units !== Infinity && (
              <div className="border-l-2 border-amber-500 py-1 pl-2 text-[10px] text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Next Tier reached
                </div>
                <p className="mt-0.5">
                  This purchase exceeds the <strong>{roundUnits(tierCapacity.units)} kWh</strong>{" "}
                  remaining in {tierCapacity.label}.
                </p>
              </div>
            )}

          {(amountNum > 0 && unitsNum > 0) || (readingNum > 0 && unitsNum > 0) ? (
            <div className="space-y-1 rounded-md bg-muted/30 p-2 text-xs">
              {amountNum > 0 && unitsNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Rate</span>
                  <span className="font-medium">{formatCurrency(effectiveRate)}/kWh</span>
                </div>
              )}
              {unitsNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Tier</span>
                  <span className="font-medium">{currentTier}</span>
                </div>
              )}
              {readingNum > 0 && unitsNum > 0 && (
                <div className="mt-1 flex justify-between border-t border-border/50 pt-1">
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Zap className="h-3 w-3" />
                    Meter: {roundUnits(readingNum)} → {roundUnits(readingNum + unitsNum)} kWh
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-9 w-full text-xs"
            disabled={amountNum <= 0 || unitsNum <= 0 || readingNum <= 0}
          >
            Add Purchase
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
