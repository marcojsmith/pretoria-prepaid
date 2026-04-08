import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { INSTALL_PROMPT_DELAY_MS, ANIMATION_OFFSET_Y } from "@/lib/constants";

/**
 * Interface for the beforeinstallprompt event
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

const PWA_DISMISSED_KEY = "pwa_dismissed";

function detectDevice() {
  const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = !!(window.navigator as IOSNavigator).standalone;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  return {
    isStandalone: isStandaloneMode || isIOSStandalone,
    isIOS: isIOSDevice,
  };
}

function InstallAction({ isIOS, onInstall }: { isIOS: boolean; onInstall: () => void }) {
  if (isIOS) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
        <span>Tap</span>
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background">
          <Share className="h-3 w-3" />
        </div>
        <span>then "Add to Home Screen"</span>
      </div>
    );
  }
  return (
    <Button size="sm" onClick={onInstall} className="h-8 px-3 text-xs">
      Install Now
    </Button>
  );
}

function InstallPromptContent({
  isIOS,
  onInstall,
  onDismiss,
}: {
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      key="install-prompt"
      initial={{ y: ANIMATION_OFFSET_Y, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: ANIMATION_OFFSET_Y, opacity: 0 }}
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl shadow-primary/20 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-bold leading-none">Install Pretoria Prepaid</h3>
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? "Add to your home screen for quick access and a better offline experience."
              : "Get a faster experience and stay updated on your balance."}
          </p>

          <div className="mt-3 flex gap-2">
            <InstallAction isIOS={isIOS} onInstall={onInstall} />
            <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 px-3 text-xs">
              Not Now
            </Button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function InstallPrompt(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ isIOS: false, isStandalone: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const { isStandalone: standalone, isIOS: ios } = detectDevice();
    setDeviceInfo({ isIOS: ios, isStandalone: standalone });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const hasDismissed = localStorage.getItem(PWA_DISMISSED_KEY);
      if (!hasDismissed && !standalone) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (ios && !standalone) {
      const hasDismissedIOS = localStorage.getItem(PWA_DISMISSED_KEY);
      if (!hasDismissedIOS) {
        timer = setTimeout(() => setIsVisible(true), INSTALL_PROMPT_DELAY_MS);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      setIsVisible(false);
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Error during PWA installation:", error);
      setIsVisible(false);
    }
  };

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
  };

  if (deviceInfo.isStandalone) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <InstallPromptContent
          isIOS={deviceInfo.isIOS}
          onInstall={() => void handleInstall()}
          onDismiss={dismiss}
        />
      )}
    </AnimatePresence>
  );
}
