"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";
import { calculateConsumptionStats } from "./electricity_logic";

/**
 * Action to check all users and send low balance alerts.
 */
export const checkLowBalances = action({
  args: {},
  handler: async (ctx) => {
    const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const contactEmail = process.env.VAPID_CONTACT_EMAIL;

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
    console.log(
      `Checking low balances for ${profiles.length} profiles with active push subscriptions.`
    );

    const nowTimestamp = Date.now();

    for (const profile of profiles) {
      if (!profile.pushSubscription) {
        console.log(
          `Profile ${profile.userId} marked as enabled but has no subscription object. Skipping.`
        );
        continue;
      }

      // Rate limit: 24 hours between alerts
      if (profile.lastAlertSent && nowTimestamp - profile.lastAlertSent < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.round(
          (24 * 60 * 60 * 1000 - (nowTimestamp - profile.lastAlertSent)) / (1000 * 60 * 60)
        );
        console.log(
          `Profile ${profile.userId} alerted recently. Cooling down (${hoursLeft}h left).`
        );
        continue;
      }

      const { readings } = await ctx.runQuery(internal.alerts_queries.getUserDataForAlert, {
        userId: profile.userId,
      });

      const filteredReadings = readings.filter(
        (r): r is typeof r & { source: "purchase" | "onboarding" } =>
          r.source === "purchase" || r.source === "onboarding"
      );
      const stats = calculateConsumptionStats(filteredReadings, profile.lowBalanceThreshold ?? 10);

      if (!stats) {
        console.log(`Could not calculate stats for profile ${profile.userId}. Missing readings?`);
        continue;
      }

      console.log(
        `Profile ${profile.userId}: Balance=${Math.round(stats.estimatedBalance)} kWh, Threshold=${stats.lowBalanceThreshold} kWh`
      );

      if (stats.estimatedBalance <= stats.lowBalanceThreshold) {
        console.log(`Threshold met for ${profile.userId}. Attempting to send push notification...`);

        try {
          const payload = JSON.stringify({
            title: "Low Electricity Balance",
            body: `Your estimated balance is ${Math.round(stats.estimatedBalance)} kWh. Time to refill!`,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            data: {
              url: "/dashboard",
            },
          });

          await webpush.sendNotification(
            profile.pushSubscription as webpush.PushSubscription,
            payload
          );

          await ctx.runMutation(internal.alerts_queries.updateAlertTimestamp, {
            userId: profile.userId,
          });

          console.log(`✅ Successfully sent alert to user ${profile.userId}`);
        } catch (err) {
          const error = err as { statusCode?: number };
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.warn(
              `❌ Push subscription for user ${profile.userId} expired or removed by browser (410/404). Cleaning up DB...`
            );
            await ctx.runMutation(internal.alerts_queries.removeExpiredSubscription, {
              userId: profile.userId,
            });
          } else if (error.statusCode === 403) {
            console.error(
              `❌ Permission denied (403) for user ${profile.userId}. VAPID keys might not match.`
            );
          } else {
            console.error(`❌ Error sending push to user ${profile.userId}:`, err);
          }
        }
      }
    }
  },
});
