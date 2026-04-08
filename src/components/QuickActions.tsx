import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calculator, Plus } from "lucide-react";

export function QuickActions(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 px-3"
        onClick={() => navigate("/calculator")}
      >
        <Calculator className="h-4 w-4" />
        <span>Smart Calc</span>
      </Button>
      <Button
        variant="default"
        size="sm"
        className="h-9 gap-2 px-3"
        onClick={() => navigate("/history")}
      >
        <Plus className="h-4 w-4" />
        <span>Log Purchase</span>
      </Button>
    </div>
  );
}
