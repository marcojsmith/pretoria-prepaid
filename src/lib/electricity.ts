export interface ElectricityRate {
  _id: string;
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

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
  isOffline?: boolean;
}

// Calculate the cost of electricity based on tiered pricing
export function calculateCost(
  units: number,
  unitsAlreadyBought: number = 0,
  rates: ElectricityRate[]
): { total: number; breakdown: TierBreakdown[] } {
  const breakdown: TierBreakdown[] = [];
  let remainingUnits = units;
  let currentPosition = unitsAlreadyBought;
  let total = 0;

  // Sort rates by tier number to ensure correct sequential calculation
  const sortedRates = [...rates].sort((a, b) => a.tier_number - b.tier_number);

  for (const rate of sortedRates) {
    if (remainingUnits <= 0) break;

    const tierStart = rate.min_units - 1;
    const tierEnd = rate.max_units ?? Infinity;

    // Skip tiers we've already passed
    if (currentPosition >= tierEnd) continue;

    // Calculate how many units fall into this tier
    const startInTier = Math.max(currentPosition, tierStart);
    const availableInTier = tierEnd - startInTier;
    const unitsInThisTier = Math.min(remainingUnits, availableInTier);

    if (unitsInThisTier > 0) {
      const cost = unitsInThisTier * rate.rate;
      breakdown.push({
        tier: rate.tier_number,
        label: rate.tier_label,
        units: unitsInThisTier,
        rate: rate.rate,
        cost,
      });
      total += cost;
      remainingUnits -= unitsInThisTier;
      currentPosition += unitsInThisTier;
    }
  }

  return { total, breakdown };
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

export function getTierProgress(
  unitsBought: number,
  rates: ElectricityRate[]
): {
  tier: ElectricityRate;
  progress: number;
  unitsInTier: number;
  unitsToNextTier: number;
}[] {
  const sortedRates = [...rates].sort((a, b) => a.tier_number - b.tier_number);

  return sortedRates.map((rate) => {
    const tierSize = rate.max_units === null ? 350 : rate.max_units - rate.min_units + 1;
    const unitsBeforeTier = rate.min_units - 1;
    const unitsInTier = Math.max(0, Math.min(unitsBought - unitsBeforeTier, tierSize));
    const progress = (unitsInTier / tierSize) * 100;
    const unitsToNextTier = rate.max_units === null ? 0 : Math.max(0, rate.max_units - unitsBought);

    return {
      tier: rate,
      progress: Math.min(100, progress),
      unitsInTier,
      unitsToNextTier,
    };
  });
}

/**
 * Calculates the remaining capacity in the current pricing tier.
 * @param unitsAlreadyBought Total units bought in the current period.
 * @param rates The tiered pricing structure.
 * @returns Object containing remaining units, tier label, and current rate.
 */
export function getRemainingTierCapacity(
  unitsAlreadyBought: number,
  rates: ElectricityRate[]
): { units: number; label: string; rate: number } {
  if (rates.length === 0) return { units: 0, label: "Unknown", rate: 0 };

  const sortedRates = [...rates].sort((a, b) => a.tier_number - b.tier_number);

  // Find the tier we are currently in or about to start
  for (const rate of sortedRates) {
    const tierEnd = rate.max_units ?? Infinity;

    if (unitsAlreadyBought < tierEnd) {
      return {
        units: tierEnd - unitsAlreadyBought,
        label: rate.tier_label,
        rate: rate.rate,
      };
    }
  }

  // If we've passed all tiers
  const lastRate = sortedRates[sortedRates.length - 1];
  return {
    units: 0,
    label: lastRate.tier_label,
    rate: lastRate.rate,
  };
}

export interface RefillInterval {
  date: string;
  daysSinceLastRefill: number | null;
  units: number;
}

/**
 * Calculates the time elapsed between consecutive purchases.
 * @param purchases Array of purchases to analyze.
 * @returns Array of refill intervals.
 */
export function calculateRefillIntervals(purchases: Purchase[]): RefillInterval[] {
  if (purchases.length === 0) return [];

  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedPurchases.map((purchase, index) => {
    if (index === 0) {
      return {
        date: purchase.date,
        daysSinceLastRefill: null,
        units: purchase.units,
      };
    }

    const current = new Date(purchase.date);
    const previous = new Date(sortedPurchases[index - 1].date);
    const diffTime = Math.abs(current.getTime() - previous.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return {
      date: purchase.date,
      daysSinceLastRefill: diffDays,
      units: purchase.units,
    };
  });
}

// Get the tier label for a given number of units (absolute units, not already bought)
export function getTierLabel(units: number, rates: ElectricityRate[]): string {
  if (rates.length === 0) return "Unknown";
  const sortedRates = [...rates].sort((a, b) => a.tier_number - b.tier_number);

  for (let i = sortedRates.length - 1; i >= 0; i--) {
    if (units >= sortedRates[i].min_units) {
      return sortedRates[i].tier_label;
    }
  }
  return sortedRates[0].tier_label;
}

// Get tier breakdown for a total number of units (from 0)
export function getTierBreakdownForUnits(
  totalUnits: number,
  rates: ElectricityRate[]
): TierBreakdown[] {
  return calculateCost(totalUnits, 0, rates).breakdown;
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
