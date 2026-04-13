import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Menu,
  LayoutDashboard,
  History,
  Calculator,
  DollarSign,
  Download,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ConnectionStatus } from "./ConnectionStatus";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Purchase History", path: "/history", icon: History },
  { title: "Smart Calculator", path: "/calculator", icon: Calculator },
  { title: "Rates", path: "/rates", icon: DollarSign },
  { title: "Import and Export Data", path: "/export", icon: Download },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Household", path: "/household", icon: Users },
];

interface NavMenuProps {
  offlineCount?: number;
}

export function NavMenu({ offlineCount }: NavMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  /**
   * Navigates to the given path and closes the nav menu sheet.
   *
   * @param path - The route path to navigate to.
   * @returns void
   */
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const menuItems = [...navItems];
  if (isAdmin) {
    menuItems.push({ title: "Admin Dashboard", path: "/admin", icon: ShieldAlert });
  }

  return (
    <div className="flex items-center gap-2">
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
            {menuItems.map((item) => (
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
      <ConnectionStatus offlineCount={offlineCount} />
    </div>
  );
}
