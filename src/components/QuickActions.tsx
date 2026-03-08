import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calculator, Plus, Activity } from "lucide-react";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Smart Calc",
      icon: Calculator,
      onClick: () => navigate("/calculator"),
      variant: "outline" as const,
    },
    {
      label: "Log Purchase",
      icon: Plus,
      onClick: () => navigate("/history"),
      variant: "default" as const,
    },
    {
      label: "Meter Reading",
      icon: Activity,
      onClick: () => navigate("/history", { state: { showReadings: true } }),
      variant: "outline" as const,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          className="h-9 gap-2 px-3"
          onClick={action.onClick}
        >
          <action.icon className="h-4 w-4" />
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
