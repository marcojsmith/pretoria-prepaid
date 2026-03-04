import { Heart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PatreonBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Heart className="h-5 w-5 flex-shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          Has this app helped you?{" "}
          <a
            href="https://www.patreon.com/MarcoSmith"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Support on Patreon
          </a>{" "}
          to help keep it running!
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
