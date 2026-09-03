import { useState } from "react";
import { Check, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMeters } from "@/hooks/useMeters";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Compact header dropdown letting a user switch which meter is "active".
 * Renders nothing when the caller has one or zero non-archived meters —
 * a switcher with a single option is noise.
 */
export function MeterSwitcher(): JSX.Element | null {
  const { meters, activeMeter, setActiveMeter } = useMeters();
  const [switchingId, setSwitchingId] = useState<Id<"meters"> | null>(null);

  if (!meters || meters.length <= 1) {
    return null;
  }

  const handleSelect = (meterId: Id<"meters">) => {
    if (meterId === activeMeter?.meterId || switchingId) return;
    setSwitchingId(meterId);
    void setActiveMeter(meterId).finally(() => setSwitchingId(null));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[10px] sm:text-xs"
          disabled={switchingId !== null}
        >
          <Gauge className="h-3.5 w-3.5" />
          <span className="max-w-[8rem] truncate">{activeMeter?.name ?? "Select meter"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch meter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {meters.map((meter) => (
          <DropdownMenuItem
            key={meter.meterId}
            className="cursor-pointer justify-between gap-2"
            disabled={switchingId !== null}
            onClick={() => handleSelect(meter.meterId)}
          >
            <div className="flex flex-col">
              <span className="text-sm">{meter.name}</span>
              {meter.meterNumber && (
                <span className="text-xs text-muted-foreground">{meter.meterNumber}</span>
              )}
            </div>
            {meter.meterId === activeMeter?.meterId && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
