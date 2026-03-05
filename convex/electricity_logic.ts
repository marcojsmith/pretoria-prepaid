import { Doc } from "./_generated/dataModel";

export interface TierBreakdown {
  tier: number;
  label: string;
  units: number;
  rate: number;
  cost: number;
}

/**
 * Calculates the cost and tier breakdown for a given number of units,
 * considering the units already bought in the current month.
 *
 * @param units - The number of units being purchased
 * @param unitsAlreadyBought - Units already purchased in the same month
 * @param rates - The electricity rates fetched from the database
 * @returns An object containing the total theoretical cost and the breakdown across tiers
 */
export function calculateTierBreakdown(
  units: number,
  unitsAlreadyBought: number,
  rates: Doc<"electricity_rates">[]
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
