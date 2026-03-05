// South African prepaid electricity pricing tiers (VAT inclusive)
export const TIERS = [
  { min: 1, max: 100, rate: 3.42585, label: "Tier 1" },
  { min: 101, max: 400, rate: 4.00936, label: "Tier 2" },
  { min: 401, max: 650, rate: 4.36816, label: "Tier 3" },
  { min: 651, max: Infinity, rate: 4.70902, label: "Tier 4" },
] as const;

export interface TierBreakdown {
  tier: number;
  label: string;
  units: number;
  rate: number;
  cost: number;
}

export interface Purchase {
  _id: string;
  date: string;
  units: number;
  cost: number;
  amountPaid: number;
  tierBreakdown: TierBreakdown[];
}

// Get the highest applicable tier rate for a given number of units
export function getHighestApplicableTierRate(units: number): number {
  if (units <= 0) return TIERS[0].rate;

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (units >= TIERS[i].min) {
      return TIERS[i].rate;
    }
  }
  return TIERS[0].rate;
}

// Get the tier label for a given number of units
export function getTierLabel(units: number): string {
  if (units <= 0) return TIERS[0].label;

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (units >= TIERS[i].min) {
      return TIERS[i].label;
    }
  }
  return TIERS[0].label;
}

// Calculate the cost if all units were bought at the highest applicable tier rate
export function calculateCostAtHighestTier(units: number): number {
  const rate = getHighestApplicableTierRate(units);
  return units * rate;
}

// Calculate the cost of electricity based on tiered pricing
export function calculateCost(
  units: number,
  unitsAlreadyBought: number = 0
): { total: number; breakdown: TierBreakdown[] } {
  const breakdown: TierBreakdown[] = [];
  let remainingUnits = units;
  let currentPosition = unitsAlreadyBought;
  let total = 0;

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    if (remainingUnits <= 0) break;

    const tierStart = tier.min - 1;
    const tierEnd = tier.max;

    // Skip tiers we've already passed
    if (currentPosition >= tierEnd) continue;

    // Calculate how many units fall into this tier
    const startInTier = Math.max(currentPosition, tierStart);
    const availableInTier = tierEnd - startInTier;
    const unitsInThisTier = Math.min(remainingUnits, availableInTier);

    if (unitsInThisTier > 0) {
      const cost = unitsInThisTier * tier.rate;
      breakdown.push({
        tier: i + 1,
        label: tier.label,
        units: unitsInThisTier,
        rate: tier.rate,
        cost,
      });
      total += cost;
      remainingUnits -= unitsInThisTier;
      currentPosition += unitsInThisTier;
    }
  }

  return { total, breakdown };
}

// Get tier breakdown for a total number of units (from 0)
export function getTierBreakdownForUnits(totalUnits: number): TierBreakdown[] {
  return calculateCost(totalUnits, 0).breakdown;
}

export function formatCurrency(amount: number): string {
  return "R " + roundCurrency(amount).toFixed(2);
}

export function roundUnits(units: number): number {
  return Math.round(units * 10) / 10;
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthName(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

export function getTierProgress(unitsBought: number): {
  tier: (typeof TIERS)[number];
  progress: number;
  unitsInTier: number;
  unitsToNextTier: number;
}[] {
  return TIERS.map((tier) => {
    const tierSize = tier.max === Infinity ? 350 : tier.max - tier.min + 1;
    const unitsBeforeTier = tier.min - 1;
    const unitsInTier = Math.max(0, Math.min(unitsBought - unitsBeforeTier, tierSize));
    const progress = (unitsInTier / tierSize) * 100;
    const unitsToNextTier = tier.max === Infinity ? 0 : Math.max(0, tier.max - unitsBought);

    return {
      tier,
      progress: Math.min(100, progress),
      unitsInTier,
      unitsToNextTier,
    };
  });
}

// Tier colors for visual display
export const TIER_BG_CLASSES = {
  1: "bg-primary",
  2: "bg-teal-500",
  3: "bg-amber-500",
  4: "bg-destructive",
} as const;

export const TIER_TEXT_CLASSES = {
  1: "text-primary",
  2: "text-teal-500",
  3: "text-amber-500",
  4: "text-destructive",
} as const;
