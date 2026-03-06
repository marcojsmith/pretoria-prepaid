import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";

const RegisterSW = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error: unknown) {
      console.error("SW registration error", error);
    },
  });

  const close = useCallback(() => {
    setOfflineReady(false);
    setNeedRefresh(false);
  }, [setOfflineReady, setNeedRefresh]);

  useEffect(() => {
    if (offlineReady) {
      toast("App ready to work offline", {
        action: {
          label: "Close",
          onClick: () => close(),
        },
      });
    }
  }, [offlineReady, close]);

  useEffect(() => {
    if (needRefresh) {
      toast("New content available, click on reload button to update.", {
        action: {
          label: "Reload",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default RegisterSW;
