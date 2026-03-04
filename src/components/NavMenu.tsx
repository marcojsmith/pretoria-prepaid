import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, LayoutDashboard, History, Calculator, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Purchase History", path: "/history", icon: History },
  { title: "Smart Calculator", path: "/calculator", icon: Calculator },
  { title: "Rates", path: "/rates", icon: DollarSign },
  { title: "Export Data", path: "/export", icon: Download },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
