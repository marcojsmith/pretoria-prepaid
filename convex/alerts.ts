"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";
import { calculateConsumptionStats } from "./electricity_logic";
import type { Doc } from "./_generated/dataModel";
import { MS_PER_DAY, MS_PER_HOUR, DEFAULT_LOW_BALANCE_THRESHOLD } from "./constants";

type ProfileDoc = Doc<"profiles">;
type MeterDoc = Doc<"meters">;

const HTTP_STATUS_GONE = 410;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_FORBIDDEN = 403;

async function sendLowBalanceNotificationToRecipient(options: {
  ctx: ActionCtx;
  profile: ProfileDoc;
  body: string;
}): Promise<void> {
  const { ctx, profile, body } = options;
  console.warn("Threshold met for meter. Attempting to send push notification...", {
    userId: profile.userId,
  });

  const payload = JSON.stringify({
    title: "Low Electricity Balance",
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: { url: "/dashboard" },
  });

  try {
    await webpush.sendNotification(profile.pushSubscription as webpush.PushSubscription, payload);
    console.warn("Successfully sent alert to user", { userId: profile.userId });
  } catch (error) {
    const httpError = error as { statusCode?: number };
    if (
      httpError.statusCode === HTTP_STATUS_GONE ||
      httpError.statusCode === HTTP_STATUS_NOT_FOUND
    ) {
      console.warn("Push subscription expired or removed by browser (410/404). Cleaning up DB...", {
        userId: profile.userId,
      });
      await ctx.runMutation(internal.alerts_queries.removeExpiredSubscription, {
        userId: profile.userId,
      });
    } else if (httpError.statusCode === HTTP_STATUS_FORBIDDEN) {
      console.error("Permission denied (403) for user. VAPID keys might not match.", {
        userId: profile.userId,
      });
    } else {
      console.error("Error sending push to user", { userId: profile.userId, error });
      throw error;
    }
  }
}

function isRateLimited(meter: MeterDoc, nowTimestamp: number): boolean {
  return !!(meter.lastAlertSent && nowTimestamp - meter.lastAlertSent < MS_PER_DAY);
}

async function computeMeterStats(
  ctx: ActionCtx,
  meter: MeterDoc
): Promise<ReturnType<typeof calculateConsumptionStats>> {
  const { readings } = await ctx.runQuery(internal.alerts_queries.getMeterDataForAlert, {
    meterId: meter._id,
  });

  const filteredReadings = readings.filter(
    (r): r is typeof r & { source: "purchase" | "onboarding" } =>
      r.source === "purchase" || r.source === "onboarding"
  );
  const stats = calculateConsumptionStats(
    filteredReadings,
    meter.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
  );

  if (!stats) {
    console.warn("Could not calculate stats for meter. Missing readings?", { meterId: meter._id });
    return null;
  }

  console.warn("Meter balance check", {
    meterId: meter._id,
    estimatedBalance: Math.round(stats.estimatedBalance),
    lowBalanceThreshold: stats.lowBalanceThreshold,
  });

  return stats;
}

async function processMeterAlert(options: {
  ctx: ActionCtx;
  meter: MeterDoc;
  nowTimestamp: number;
  householdMeterCount: number;
}): Promise<void> {
  const { ctx, meter, nowTimestamp, householdMeterCount } = options;

  if (isRateLimited(meter, nowTimestamp)) {
    const hoursLeft = Math.round(
      (MS_PER_DAY - (nowTimestamp - (meter.lastAlertSent ?? 0))) / MS_PER_HOUR
    );
    console.warn("Meter alerted recently. Cooling down.", { meterId: meter._id, hoursLeft });
    return;
  }

  const recipients = await ctx.runQuery(internal.alerts_queries.getMeterAlertRecipients, {
    householdId: meter.householdId,
  });
  if (recipients.length === 0) {
    return;
  }

  const stats = await computeMeterStats(ctx, meter);
  if (!stats || stats.estimatedBalance > stats.lowBalanceThreshold) {
    return;
  }

  await sendMeterAlerts({
    ctx,
    meter,
    recipients,
    estimatedBalance: stats.estimatedBalance,
    householdMeterCount,
  });
}

async function sendMeterAlerts(options: {
  ctx: ActionCtx;
  meter: MeterDoc;
  recipients: ProfileDoc[];
  estimatedBalance: number;
  householdMeterCount: number;
}): Promise<void> {
  const { ctx, meter, recipients, estimatedBalance, householdMeterCount } = options;

  // Only name the meter in the copy when the household actually has more
  // than one meter — keeps today's generic wording for the common
  // single-meter case, avoiding unnecessary UI churn.
  const body =
    householdMeterCount > 1
      ? `${meter.name}'s estimated balance is ${Math.round(estimatedBalance)} kWh. Time to refill!`
      : `Your estimated balance is ${Math.round(estimatedBalance)} kWh. Time to refill!`;

  for (const profile of recipients) {
    try {
      await sendLowBalanceNotificationToRecipient({ ctx, profile, body });
    } catch (error) {
      console.error("Failed to send alert to recipient", { userId: profile.userId, error });
    }
  }

  await ctx.runMutation(internal.alerts_queries.updateMeterAlertTimestamp, {
    meterId: meter._id,
  });
}

/**
 * Action to check all meters and send low balance alerts to subscribed
 * household members. Cooldown (`lastAlertSent`) and thresholds live on the
 * meter, not the profile, so members sharing a meter share one cooldown and
 * are alerted about that meter regardless of which meter is active for them
 * individually.
 */
export const checkLowBalances = action({
  args: {},
  handler: async (ctx) => {
    const publicKey = process.env["VITE_VAPID_PUBLIC_KEY"];
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    const contactEmail = process.env["VAPID_CONTACT_EMAIL"];

    if (!publicKey || !privateKey || !contactEmail) {
      console.error("VAPID keys or contact email are not configured in environment variables.");
      return;
    }

    try {
      webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);
    } catch (error) {
      console.error("Failed to set VAPID details. Keys might be invalid:", error);
      return;
    }

    const meters = await ctx.runQuery(internal.alerts_queries.getMetersForAlerts);
    console.warn("Checking low balances for meters.", { meterCount: meters.length });

    const householdMeterCounts = new Map<string, number>();
    for (const meter of meters) {
      householdMeterCounts.set(
        meter.householdId,
        (householdMeterCounts.get(meter.householdId) ?? 0) + 1
      );
    }

    const nowTimestamp = Date.now();

    let failureCount = 0;
    for (const meter of meters) {
      try {
        await processMeterAlert({
          ctx,
          meter,
          nowTimestamp,
          householdMeterCount: householdMeterCounts.get(meter.householdId) ?? 1,
        });
      } catch (error) {
        failureCount++;
        console.error("Failed to process alert for meter", { meterId: meter._id, error });
      }
    }
    if (failureCount > 0) {
      console.error("Alert processing complete with failures", {
        failureCount,
        totalMeters: meters.length,
      });
    }
  },
});
