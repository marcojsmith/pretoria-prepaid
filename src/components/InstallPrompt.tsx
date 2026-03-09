import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Check if the app is already installed/running in standalone mode
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    // navigator.standalone is iOS specific
    const isIOSStandalone = (window.navigator as IOSNavigator).standalone === true;

    setIsStandalone(isStandaloneMode || isIOSStandalone);

    // Detect iOS (including iPadOS 13+)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Handle Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show after a short delay or based on some user interaction
      // to avoid being too intrusive immediately
      const hasDismissed = localStorage.getItem("pwa-prompt-dismissed");
      if (!hasDismissed && !isStandaloneMode) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS manual instructions if not standalone and not dismissed
    if (isIOSDevice && !isIOSStandalone) {
      const hasDismissed = localStorage.getItem("pwa-prompt-dismissed");
      if (!hasDismissed) {
        // Show after 5 seconds on iOS to allow page to load
        timer = setTimeout(() => setIsVisible(true), 5000);
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
      } else {
        // If dismissed, we might want to show it again later
        // For now, we'll keep it hidden in this session
      }
    } catch (error) {
      console.error("Error during PWA installation:", error);
      // Fallback if something fails
      setIsVisible(false);
    }
  };

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="install-prompt"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
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
                {isIOS ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                    <span>Tap</span>
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                      <Share className="h-3 w-3" />
                    </div>
                    <span>then "Add to Home Screen"</span>
                  </div>
                ) : (
                  <Button size="sm" onClick={handleInstall} className="h-8 px-3 text-xs">
                    Install Now
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 px-3 text-xs">
                  Not Now
                </Button>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
