import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
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
    onRegisterError(error: any) {
      console.error("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (offlineReady) {
      toast("App ready to work offline", {
        action: {
          label: "Close",
          onClick: () => close(),
        },
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast("New content available, click on reload button to update.", {
        action: {
          label: "Reload",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh]);

  return null;
};

export default RegisterSW;
