import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTierProgress, formatCurrency, roundUnits } from "@/lib/electricity";
import type { ElectricityRate } from "@/lib/electricity";
import { useRates } from "@/hooks/useRates";
import { cn } from "@/lib/utils";
import { Layers, Loader2 } from "lucide-react";
import { MAX_TIER_PERCENTAGE } from "@/lib/constants";

interface TierProgressProps {
  unitsBought: number;
}

const TIER_PROGRESS_CLASSES = [
  "bg-primary/20 [&>div]:bg-primary",
  "bg-sky-500/20 [&>div]:bg-sky-500",
  "bg-amber-500/20 [&>div]:bg-amber-500",
  "bg-destructive/20 [&>div]:bg-destructive",
];

function TierRow({
  tier,
  progress,
  unitsInTier,
  unitsToNextTier,
  index,
}: {
  tier: { tier_label: string; max_units: number | null; min_units: number; rate: number };
  progress: number;
  unitsInTier: number;
  unitsToNextTier: number;
  index: number;
}) {
  const tierMax = tier.max_units === null ? "∞" : tier.max_units - tier.min_units + 1;
  return (
    <div key={tier.tier_label} className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium">
          {tier.tier_label}{" "}
          <span className="font-normal text-muted-foreground">
            ({roundUnits(unitsInTier)} / {tierMax} kWh
            {unitsToNextTier > 0 && progress < MAX_TIER_PERCENTAGE && (
              <> • {roundUnits(unitsToNextTier)} to next tier</>
            )}
            )
          </span>
        </span>
        <span className="text-muted-foreground">{formatCurrency(tier.rate)}/kWh</span>
      </div>
      <Progress value={progress} className={cn("h-2", TIER_PROGRESS_CLASSES[index])} />
    </div>
  );
}

export function TierProgress({ unitsBought }: TierProgressProps): JSX.Element {
  const { rates, loading: ratesLoading } = useRates();

  if (ratesLoading) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const tierProgress = getTierProgress(unitsBought, rates as ElectricityRate[]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Tier Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tierProgress.map((item, index) => (
          <TierRow key={item.tier.tier_label} {...item} index={index} />
        ))}
      </CardContent>
    </Card>
  );
}
