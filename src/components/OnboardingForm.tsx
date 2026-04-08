import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { DEFAULT_BURN_RATE } from "../../convex/electricity_logic";

interface OnboardingFormProps {
  onSubmit: (reading: number, defaultDailyUsage?: number) => void;
}

function ReadingField({
  reading,
  setReading,
}: {
  reading: string;
  setReading: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="reading" className="text-sm font-medium">
        Current Meter Reading (kWh)
      </Label>
      <Input
        id="reading"
        type="number"
        placeholder="e.g. 1234.5"
        value={reading}
        onChange={(e) => setReading(e.target.value)}
        min="0"
        step="0.1"
        required
        className="h-10"
      />
      <p className="text-xs text-muted-foreground">
        Enter the "units remaining" value shown on your physical meter.
      </p>
    </div>
  );
}

function DailyUsageField({
  dailyUsage,
  setDailyUsage,
}: {
  dailyUsage: string;
  setDailyUsage: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="dailyUsage" className="text-sm font-medium">
        Estimated Daily Usage (optional)
      </Label>
      <Input
        id="dailyUsage"
        type="number"
        placeholder={`Default: ${DEFAULT_BURN_RATE} kWh/day`}
        value={dailyUsage}
        onChange={(e) => setDailyUsage(e.target.value)}
        min="0.1"
        step="0.1"
        className="h-10"
      />
      <p className="text-xs text-muted-foreground">
        Roughly how many kWh do you use per day? Leave blank to use {DEFAULT_BURN_RATE} kWh —
        we&apos;ll calculate your actual usage after your first purchase.
      </p>
    </div>
  );
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps): JSX.Element {
  const [reading, setReading] = useState("");
  const [dailyUsage, setDailyUsage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const readingNum = parseFloat(reading);
    if (isNaN(readingNum) || readingNum < 0) return;

    const dailyUsageNum = dailyUsage ? parseFloat(dailyUsage) : undefined;
    onSubmit(readingNum, dailyUsageNum);
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Welcome! Let's get started
        </CardTitle>
        <CardDescription className="text-sm">
          Enter your current meter reading so we can track your electricity usage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ReadingField reading={reading} setReading={setReading} />
          <DailyUsageField dailyUsage={dailyUsage} setDailyUsage={setDailyUsage} />

          <Button type="submit" className="h-10 w-full" disabled={!reading}>
            Get Started
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
