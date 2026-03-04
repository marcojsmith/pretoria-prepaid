import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, getTierLabel, roundUnits, roundCurrency } from "@/lib/electricity";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddPurchaseFormProps {
  unitsAlreadyBought: number;
  onAdd: (units: number, amountPaid: number, date: string) => void;
  prefillAmount?: number;
  prefillUnits?: number;
}

export function AddPurchaseForm({
  unitsAlreadyBought,
  onAdd,
  prefillAmount,
  prefillUnits,
}: AddPurchaseFormProps) {
  const [amountPaid, setAmountPaid] = useState("");
  const [unitsReceived, setUnitsReceived] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Pre-fill values when provided
  useEffect(() => {
    if (prefillAmount && prefillAmount > 0) {
      setAmountPaid(roundCurrency(prefillAmount).toString());
    }
    if (prefillUnits && prefillUnits > 0) {
      setUnitsReceived(roundUnits(prefillUnits).toString());
    }
  }, [prefillAmount, prefillUnits]);

  const amountNum = parseFloat(amountPaid) || 0;
  const unitsNum = parseFloat(unitsReceived) || 0;
  const effectiveRate = unitsNum > 0 ? amountNum / unitsNum : 0;
  const currentTier = getTierLabel(unitsAlreadyBought + unitsNum);

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
    onAdd(unitsNum, amountNum, date);
    setAmountPaid("");
    setUnitsReceived("");
    toast.success(`Added ${roundUnits(unitsNum)} kWh for ${formatCurrency(amountNum)}`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plus className="h-3 w-3 text-primary" />
          Record Purchase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">
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
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="units" className="text-xs">
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
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {amountNum > 0 && unitsNum > 0 && (
            <div className="space-y-1 rounded-md bg-muted/30 p-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Rate</span>
                <span className="font-medium">{formatCurrency(effectiveRate)}/kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Tier</span>
                <span className="font-medium">{currentTier}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="h-8 w-full text-xs"
            disabled={amountNum <= 0 || unitsNum <= 0}
          >
            Add Purchase
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
