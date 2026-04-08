import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { subscribeUserToPush, isPushSupported } from "@/lib/push-notifications";

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Profile extends Doc<"profiles"> {
  pushSubscription?: PushSubscription;
}

type UpdateProfileMutation = ReturnType<typeof useMutation<typeof api.users.updateProfile>>;

export interface UseProfileReturn {
  profile: Profile | null | undefined;
  updateProfile: UpdateProfileMutation;
  loading: boolean;
}

export function useProfile(): UseProfileReturn {
  const profile = useQuery(api.users.getProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const updatePushSubscription = useMutation(api.users.updatePushSubscription);

  const hasSyncedRef = useRef(false);

  // Silent sync of push subscription
  useEffect(() => {
    if (
      !profile ||
      !profile.pushNotificationsEnabled ||
      hasSyncedRef.current ||
      !isPushSupported()
    ) {
      return;
    }

    const syncSubscription = async () => {
      hasSyncedRef.current = true;

      try {
        const subscription = await subscribeUserToPush();

        if (!subscription) {
          return;
        }

        const currentSub = profile.pushSubscription;
        const isDifferent =
          !currentSub ||
          currentSub.endpoint !== subscription.endpoint ||
          JSON.stringify(currentSub.keys) !== JSON.stringify(subscription.keys);

        if (isDifferent) {
          await updatePushSubscription({
            pushNotificationsEnabled: true,
            pushSubscription: subscription,
          });
        }
      } catch (error) {
        console.error("Failed to silently sync push subscription:", error);
      }
    };

    void syncSubscription();
  }, [profile, updatePushSubscription]);

  return {
    profile,
    updateProfile,
    loading: profile === undefined,
  };
}
