import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";
import { subscribeUserToPush, isPushSupported } from "@/lib/push-notifications";

export function useProfile() {
  const profile = useQuery(api.users.getProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const updatePushSubscription = useMutation(api.users.updatePushSubscription);

  const hasSyncedRef = useRef(false);

  // Silent sync of push subscription
  useEffect(() => {
    // Only run if profile exists and push is enabled, and we haven't synced this session
    if (profile && profile.pushNotificationsEnabled && !hasSyncedRef.current && isPushSupported()) {
      const syncSubscription = async () => {
        // Set synced flag immediately to prevent re-entrancy
        hasSyncedRef.current = true;

        try {
          const subscription = await subscribeUserToPush();

          if (!subscription) {
            console.log("No push subscription available.");
            return;
          }

          // Check if the subscription actually changed before sending to Convex
          const currentSub = profile.pushSubscription;
          const isDifferent =
            !currentSub ||
            currentSub.endpoint !== subscription.endpoint ||
            JSON.stringify(currentSub.keys) !== JSON.stringify(subscription.keys);

          if (isDifferent) {
            console.log("Push subscription changed or missing on backend. Syncing...");
            await updatePushSubscription({
              pushNotificationsEnabled: true,
              pushSubscription: subscription,
            });
          }
        } catch (err) {
          console.error("Failed to silently sync push subscription:", err);
          // Optional: reset flag on error if you want to retry next render
          // hasSyncedRef.current = false;
        }
      };

      syncSubscription();
    }
  }, [profile, updatePushSubscription]);

  return {
    profile,
    updateProfile,
    loading: profile === undefined,
  };
}
