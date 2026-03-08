import { Heart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PatreonBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2">
      <div className="flex w-full items-center justify-center gap-2 text-xs">
        <Heart className="h-4 w-4 text-primary" />
        <span>
          Has this app helped you?{" "}
          <a
            href="https://www.patreon.com/MarcoSmith"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Support on Patreon
          </a>
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss Patreon banner"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
