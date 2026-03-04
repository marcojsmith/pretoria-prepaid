import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTierProgress, formatCurrency, roundUnits } from "@/lib/electricity";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface TierProgressProps {
  unitsBought: number;
}

export function TierProgress({ unitsBought }: TierProgressProps) {
  const tierProgress = getTierProgress(unitsBought);

  // Map tier index to the correct bg class for the progress bar
  const tierProgressClasses = [
    "bg-primary/20 [&>div]:bg-primary",
    "bg-teal-500/20 [&>div]:bg-teal-500",
    "bg-amber-500/20 [&>div]:bg-amber-500",
    "bg-destructive/20 [&>div]:bg-destructive",
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Tier Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tierProgress.map(({ tier, progress, unitsInTier, unitsToNextTier }, index) => (
          <div key={tier.label} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{tier.label}</span>
              <span className="text-muted-foreground">{formatCurrency(tier.rate)}/kWh</span>
            </div>
            <Progress value={progress} className={cn("h-2", tierProgressClasses[index])} />
            <p className="text-xs text-muted-foreground">
              {roundUnits(unitsInTier)} / {tier.max === Infinity ? "∞" : tier.max - tier.min + 1}{" "}
              kWh
              {unitsToNextTier > 0 && progress < 100 && (
                <span className="ml-1">• {roundUnits(unitsToNextTier)} to next tier</span>
              )}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
