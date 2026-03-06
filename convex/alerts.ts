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
      console.error("VAPID keys or contact email are not configured.");
      return;
    }

    webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);

    const profiles = await ctx.runQuery(internal.alerts_queries.getProfilesForAlerts);
    const nowTimestamp = Date.now();

    for (const profile of profiles) {
      if (!profile.pushSubscription) continue;

      // Rate limit: 24 hours between alerts
      if (profile.lastAlertSent && nowTimestamp - profile.lastAlertSent < 24 * 60 * 60 * 1000) {
        continue;
      }

      const { readings, purchases } = await ctx.runQuery(
        internal.alerts_queries.getUserDataForAlert,
        {
          userId: profile.userId,
        }
      );

      const stats = calculateConsumptionStats(
        readings,
        purchases,
        profile.lowBalanceThreshold ?? 10
      );

      if (stats && stats.estimatedBalance <= stats.lowBalanceThreshold) {
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

          console.log(`Sent alert to user ${profile.userId}`);
        } catch (err) {
          const error = err as { statusCode?: number };
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Push subscription for user ${profile.userId} expired. Removing...`);
            await ctx.runMutation(internal.alerts_queries.removeExpiredSubscription, {
              userId: profile.userId,
            });
          } else {
            console.error(`Error sending push to user ${profile.userId}:`, err);
          }
        }
      }
    }
  },
});
