import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  offlineCount?: number | undefined;
  className?: string;
}

export function ConnectionStatus({ offlineCount = 0, className }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && offlineCount === 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isOnline ? (
        <Badge variant="destructive" className="flex animate-pulse gap-1.5 px-2 py-0.5 text-[10px]">
          <WifiOff className="h-3 w-3" />
          Offline Mode
        </Badge>
      ) : (
        offlineCount > 0 && (
          <Badge
            variant="outline"
            className="flex gap-1.5 border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700"
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing {offlineCount} items...
          </Badge>
        )
      )}
    </div>
  );
}
