import {
  UNITS_PRECISION_FACTOR,
  CURRENCY_PRECISION_FACTOR,
  MS_PER_DAY,
  UNLIMITED_TIER_ASSUMED_SIZE,
  MAX_TIER_PERCENTAGE,
  MONTHS_IN_YEAR,
} from "./constants";

export enum Tier {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
}

const VALID_TIER_VALUES = new Set<number>([Tier.One, Tier.Two, Tier.Three, Tier.Four]);

/**
 * Validates a number is a valid Tier.
 * @param val The value to validate.
 * @returns A valid Tier or Tier.One as fallback.
 */
export function toTier(val: number): Tier {
  if (VALID_TIER_VALUES.has(val)) return val as Tier;
  return Tier.One;
}

export interface ElectricityRate {
  _id: string;
  tier_number: number;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

export interface TierBreakdown {
  tier: Tier;
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
export function calculateCost(options: {
  units: number;
  unitsAlreadyBought?: number;
  rates: ElectricityRate[];
}): { total: number; breakdown: TierBreakdown[] } {
  const { units, unitsAlreadyBought = 0, rates } = options;
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
        tier: toTier(rate.tier_number),
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

/**
 * Calculates how many kWh a given Rand amount buys, starting from unitsAlreadyBought.
 * Inverse of calculateCost.
 */
export function calculateUnitsFromAmount(options: {
  amount: number;
  unitsAlreadyBought: number;
  rates: ElectricityRate[];
}): { units: number; breakdown: TierBreakdown[] } {
  const { amount, unitsAlreadyBought, rates } = options;
  if (amount <= 0 || rates.length === 0) return { units: 0, breakdown: [] };

  const breakdown: TierBreakdown[] = [];
  let remainingAmount = amount;
  let currentPosition = unitsAlreadyBought;
  let totalUnits = 0;

  const sortedRates = [...rates].sort((a, b) => a.tier_number - b.tier_number);

  for (const rate of sortedRates) {
    if (remainingAmount <= 0) break;

    const tierStart = rate.min_units - 1;
    const tierEnd = rate.max_units ?? Infinity;

    if (currentPosition >= tierEnd) continue;

    const startInTier = Math.max(currentPosition, tierStart);
    const availableInTier = tierEnd === Infinity ? Infinity : tierEnd - startInTier;
    const costForFullTier = availableInTier === Infinity ? Infinity : availableInTier * rate.rate;

    const unitsInThisTier =
      remainingAmount >= costForFullTier ? availableInTier : remainingAmount / rate.rate;

    const cost = unitsInThisTier * rate.rate;

    breakdown.push({
      tier: toTier(rate.tier_number),
      label: rate.tier_label,
      units: unitsInThisTier,
      rate: rate.rate,
      cost,
    });

    totalUnits += unitsInThisTier;
    remainingAmount -= cost;
    currentPosition += unitsInThisTier;
  }

  return { units: totalUnits, breakdown };
}

export function formatCurrency(amount: number): string {
  return "R " + roundCurrency(amount).toFixed(2);
}

export function roundUnits(units: number): number {
  return Math.round(units * UNITS_PRECISION_FACTOR) / UNITS_PRECISION_FACTOR;
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * CURRENCY_PRECISION_FACTOR) / CURRENCY_PRECISION_FACTOR;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthName(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return "Unknown";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > MONTHS_IN_YEAR) return "Unknown";
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diffTime = lastDay.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / MS_PER_DAY));
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
    const tierSize =
      rate.max_units === null ? UNLIMITED_TIER_ASSUMED_SIZE : rate.max_units - rate.min_units + 1;
    const unitsBeforeTier = rate.min_units - 1;
    const unitsInTier = Math.max(0, Math.min(unitsBought - unitsBeforeTier, tierSize));
    const progress = (unitsInTier / tierSize) * MAX_TIER_PERCENTAGE;
    const unitsToNextTier = rate.max_units === null ? 0 : Math.max(0, rate.max_units - unitsBought);

    return {
      tier: rate,
      progress: Math.min(MAX_TIER_PERCENTAGE, progress),
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
    label: lastRate?.tier_label ?? "Unknown",
    rate: lastRate?.rate ?? 0,
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

  const sortedPurchases = [...purchases].sort((a, b) => {
    const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComp !== 0) return dateComp;
    // Stable sort using ID if dates are identical
    return a._id.localeCompare(b._id);
  });

  return sortedPurchases.map((purchase, index) => {
    if (index === 0) {
      return {
        date: purchase.date,
        daysSinceLastRefill: null,
        units: purchase.units,
      };
    }

    const current = new Date(purchase.date);
    const previous = new Date((sortedPurchases[index - 1] ?? purchase).date);

    // Set both to midnight for pure day difference
    const d1 = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const d2 = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate());

    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / MS_PER_DAY));

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
    const rate = sortedRates[i];
    if (rate && units >= rate.min_units) {
      return rate.tier_label;
    }
  }
  return sortedRates[0]?.tier_label ?? "Unknown";
}

// Get tier breakdown for a total number of units (from 0)
export function getTierBreakdownForUnits(
  totalUnits: number,
  rates: ElectricityRate[]
): TierBreakdown[] {
  return calculateCost({ units: totalUnits, unitsAlreadyBought: 0, rates }).breakdown;
}

// Tier colors for visual display
export const TIER_BG_CLASSES: Record<Tier, string> = {
  [Tier.One]: "bg-primary",
  [Tier.Two]: "bg-sky-500",
  [Tier.Three]: "bg-amber-500",
  [Tier.Four]: "bg-destructive",
};

export const TIER_TEXT_CLASSES: Record<Tier, string> = {
  [Tier.One]: "text-primary",
  [Tier.Two]: "text-sky-500",
  [Tier.Three]: "text-amber-500",
  [Tier.Four]: "text-destructive",
};
