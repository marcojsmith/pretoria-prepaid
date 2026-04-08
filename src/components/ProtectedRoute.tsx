import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps): JSX.Element | null {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && !roleLoading && requireAdmin && user && !isAdmin) {
      navigate("/dashboard");
    }
  }, [user, authLoading, isAdmin, roleLoading, requireAdmin, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  // If we require admin and user is not admin, don't render children while redirecting
  if (requireAdmin && !isAdmin) {
    return null;
  }

  // If we require auth and user is not logged in, don't render children while redirecting
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
