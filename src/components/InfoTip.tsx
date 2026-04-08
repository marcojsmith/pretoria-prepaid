import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CircleHelp } from "lucide-react";

interface InfoTipProps {
  text: string;
}

export function InfoTip({ text }: InfoTipProps): JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className="inline-flex cursor-pointer items-center text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <CircleHelp className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[220px] p-2 text-xs">
        {text}
      </PopoverContent>
    </Popover>
  );
}
