"use node";

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";
import { calculateConsumptionStats } from "./electricity_logic";
import type { Doc } from "./_generated/dataModel";
import { MS_PER_DAY, MS_PER_HOUR, DEFAULT_LOW_BALANCE_THRESHOLD } from "./constants";

type ProfileDoc = Doc<"profiles">;

const HTTP_STATUS_GONE = 410;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_FORBIDDEN = 403;

async function sendLowBalanceNotification(options: {
  ctx: ActionCtx;
  profile: ProfileDoc;
  estimatedBalance: number;
}): Promise<void> {
  const { ctx, profile, estimatedBalance } = options;
  console.warn("Threshold met for user. Attempting to send push notification...", {
    userId: profile.userId,
  });

  const payload = JSON.stringify({
    title: "Low Electricity Balance",
    body: `Your estimated balance is ${Math.round(estimatedBalance)} kWh. Time to refill!`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: { url: "/dashboard" },
  });

  try {
    await webpush.sendNotification(profile.pushSubscription as webpush.PushSubscription, payload);
    await ctx.runMutation(internal.alerts_queries.updateAlertTimestamp, {
      userId: profile.userId,
    });
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

function isRateLimited(profile: ProfileDoc, nowTimestamp: number): boolean {
  return !!(profile.lastAlertSent && nowTimestamp - profile.lastAlertSent < MS_PER_DAY);
}

async function processProfileAlert(options: {
  ctx: ActionCtx;
  profile: ProfileDoc;
  nowTimestamp: number;
}): Promise<void> {
  const { ctx, profile, nowTimestamp } = options;
  if (!profile.pushSubscription) {
    console.warn("Profile marked as enabled but has no subscription object. Skipping.", {
      userId: profile.userId,
    });
    return;
  }

  if (isRateLimited(profile, nowTimestamp)) {
    const hoursLeft = Math.round(
      (MS_PER_DAY - (nowTimestamp - (profile.lastAlertSent ?? 0))) / MS_PER_HOUR
    );
    console.warn("Profile alerted recently. Cooling down.", { userId: profile.userId, hoursLeft });
    return;
  }

  const { readings } = await ctx.runQuery(internal.alerts_queries.getUserDataForAlert, {
    userId: profile.userId,
  });

  const filteredReadings = readings.filter(
    (r): r is typeof r & { source: "purchase" | "onboarding" } =>
      r.source === "purchase" || r.source === "onboarding"
  );
  const stats = calculateConsumptionStats(
    filteredReadings,
    profile.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
  );

  if (!stats) {
    console.warn("Could not calculate stats for profile. Missing readings?", {
      userId: profile.userId,
    });
    return;
  }

  console.warn("Profile balance check", {
    userId: profile.userId,
    estimatedBalance: Math.round(stats.estimatedBalance),
    lowBalanceThreshold: stats.lowBalanceThreshold,
  });

  if (stats.estimatedBalance <= stats.lowBalanceThreshold) {
    await sendLowBalanceNotification({ ctx, profile, estimatedBalance: stats.estimatedBalance });
  }
}

/**
 * Action to check all users and send low balance alerts.
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

    const profiles = await ctx.runQuery(internal.alerts_queries.getProfilesForAlerts);
    console.warn("Checking low balances for profiles with active push subscriptions.", {
      profileCount: profiles.length,
    });

    const nowTimestamp = Date.now();

    let failureCount = 0;
    for (const profile of profiles) {
      try {
        await processProfileAlert({ ctx, profile, nowTimestamp });
      } catch (error) {
        failureCount++;
        console.error("Failed to process alert for profile", { userId: profile.userId, error });
      }
    }
    if (failureCount > 0) {
      console.error("Alert processing complete with failures", {
        failureCount,
        totalProfiles: profiles.length,
      });
    }
  },
});
