/**
 * Interface for meter readings with pre/post purchase values.
 */
export interface MeterReading {
  _id?: string;
  date: string;
  readingPre: number;
  readingPost: number;
  source: "purchase" | "onboarding";
}

export const DEFAULT_BURN_RATE = 10;

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
  rates: {
    tier_number: number;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }[]
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

// How many purchase intervals to include in the weighted average (requires N+1 readings)
const MAX_INTERVALS = 5;
// Exponential decay factor: most recent interval gets weight 1, next gets 0.5, then 0.25, etc.
const WEIGHT_DECAY = 0.5;

/**
 * Calculates consumption stats based on readings with pre/post values.
 *
 * Burn rate is a weighted average of up to 5 recent purchase intervals:
 *   usage per interval = older.readingPost − newer.readingPre
 *   rate per interval  = usage ÷ daysBetween
 * Weights decay exponentially (most recent = highest weight) so one outlier
 * period (holiday, guests) doesn't dominate the result.
 */
export function calculateConsumptionStats(
  readings: MeterReading[],
  lowBalanceThreshold: number
): ConsumptionStats | null {
  if (readings.length === 0) return null;

  const lastReading = readings[0];
  let dailyBurnRate = 0;

  // Use up to MAX_INTERVALS+1 purchase readings to compute MAX_INTERVALS interval rates
  const purchaseReadings = readings
    .filter((r) => r.source === "purchase")
    .slice(0, MAX_INTERVALS + 1);

  if (purchaseReadings.length >= 2) {
    const intervalRates: number[] = [];

    for (let i = 0; i < purchaseReadings.length - 1; i++) {
      const newer = purchaseReadings[i];
      const older = purchaseReadings[i + 1];
      const daysDiff =
        (new Date(newer.date).getTime() - new Date(older.date).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        const usage = older.readingPost - newer.readingPre;
        const rate = usage / daysDiff;
        // Skip negative rates — they indicate a data entry error
        if (rate >= 0) {
          intervalRates.push(rate);
        }
      }
    }

    if (intervalRates.length > 0) {
      // Exponentially decaying weights: index 0 (most recent) = weight 1, index 1 = 0.5, etc.
      const rawWeights = intervalRates.map((_, i) => Math.pow(WEIGHT_DECAY, i));
      const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
      dailyBurnRate = intervalRates.reduce(
        (sum, rate, i) => sum + rate * (rawWeights[i] / totalWeight),
        0
      );
    }
  }

  // Estimate current balance based on last reading and time passed
  const now = new Date();
  const lastReadingDate = new Date(lastReading.date);

  // readingPost of the most recent reading is always the anchor
  const anchorBalance = lastReading.readingPost;

  const todayStr = now.toISOString().split("T")[0];
  let daysSinceLastReading = 0;

  if (lastReading.date !== todayStr) {
    // Only apply estimated burn rate if the reading wasn't taken today
    daysSinceLastReading = Math.max(
      0,
      (now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Default burn rate if we don't have enough data
  const effectiveBurnRate = dailyBurnRate > 0 ? dailyBurnRate : DEFAULT_BURN_RATE;
  const estimatedUsageSinceLast = daysSinceLastReading * effectiveBurnRate;

  // Balance = anchorBalance - Usage Since Last Reading
  const estimatedBalance = Math.max(0, anchorBalance - estimatedUsageSinceLast);

  // Days until we hit ZERO
  const daysRemaining = effectiveBurnRate > 0 ? estimatedBalance / effectiveBurnRate : 0;

  // Days until we hit the LOW threshold
  const daysRemainingUntilLow =
    effectiveBurnRate > 0
      ? Math.max(0, (estimatedBalance - lowBalanceThreshold) / effectiveBurnRate)
      : 0;

  return {
    lastReading: lastReading.readingPost,
    lastReadingDate: lastReading.date,
    dailyBurnRate,
    estimatedBalance,
    daysRemaining,
    daysRemainingUntilLow,
    lowBalanceThreshold,
    isEstimatedBurnRate: purchaseReadings.length < 2,
  };
}
