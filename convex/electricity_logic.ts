import { Doc } from "./_generated/dataModel";

export interface TierBreakdown {
  tier: number;
  label: string;
  units: number;
  rate: number;
  cost: number;
}

export interface ConsumptionStats {
  lastReading: number;
  lastReadingDate: string;
  dailyBurnRate: number;
  estimatedBalance: number;
  daysRemaining: number;
  daysRemainingUntilLow: number;
  lowBalanceThreshold: number;
  isEstimatedBurnRate: boolean;
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

/**
 * Calculates consumption stats based on readings and purchases.
 */
export function calculateConsumptionStats(
  readings: Doc<"meter_readings">[],
  purchases: Doc<"purchases">[],
  lowBalanceThreshold: number
): ConsumptionStats | null {
  if (readings.length === 0) return null;

  const lastReading = readings[0];
  let dailyBurnRate = 0;

  if (readings.length >= 2) {
    const prevReading = readings[1];
    const date1 = new Date(lastReading.date);
    const date2 = new Date(prevReading.date);
    const daysDiff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 0) {
      // Purchases between these two readings
      const purchasesBetween = purchases.filter(
        (p) => p.date > prevReading.date && p.date <= lastReading.date
      );

      const totalPurchased = purchasesBetween.reduce((sum, p) => sum + p.units, 0);

      // Usage = (Previous Reading + Purchases) - Current Reading
      const usage = prevReading.reading + totalPurchased - lastReading.reading;
      dailyBurnRate = usage / daysDiff;
    }
  }

  // Estimate current balance based on last reading and time passed
  const now = new Date();
  const lastReadingDate = new Date(lastReading.date);
  const daysSinceLastReading = (now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24);

  // Default burn rate if we don't have enough data (e.g. 10 kWh/day)
  const effectiveBurnRate = dailyBurnRate > 0 ? dailyBurnRate : 10;
  const estimatedUsageSinceLast = Math.max(0, daysSinceLastReading * effectiveBurnRate);
  const estimatedBalance = Math.max(0, lastReading.reading - estimatedUsageSinceLast);

  // Days until we hit ZERO
  const daysRemaining = effectiveBurnRate > 0 ? estimatedBalance / effectiveBurnRate : 0;

  // Days until we hit the LOW threshold (the beep)
  const daysRemainingUntilLow =
    effectiveBurnRate > 0
      ? Math.max(0, (estimatedBalance - lowBalanceThreshold) / effectiveBurnRate)
      : 0;

  return {
    lastReading: lastReading.reading,
    lastReadingDate: lastReading.date,
    dailyBurnRate,
    estimatedBalance,
    daysRemaining,
    daysRemainingUntilLow,
    lowBalanceThreshold,
    isEstimatedBurnRate: dailyBurnRate === 0,
  };
}
