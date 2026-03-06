import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";

interface AddReadingFormProps {
  onAdd: (reading: number, date: string) => void;
}

export function AddReadingForm({ onAdd }: AddReadingFormProps) {
  const [reading, setReading] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const readingNum = parseFloat(reading);
    if (isNaN(readingNum) || readingNum < 0) return;

    onAdd(readingNum, date);
    setReading("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-primary" />
          Log Meter Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reading" className="text-xs">
              Units Remaining (kWh)
            </Label>
            <Input
              id="reading"
              type="number"
              placeholder="e.g. 120.5"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              min="0"
              step="0.1"
              required
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Enter the "units remaining" value shown on your physical meter.
            </p>
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
              required
              className="h-8 text-xs"
            />
          </div>

          <Button type="submit" className="h-8 w-full text-xs" disabled={!reading}>
            Log Reading
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
