import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import RegisterSW from "@/components/RegisterSW";
import { InstallPrompt } from "@/components/InstallPrompt";
import { clearBadge } from "@/lib/push-notifications";
import "./App.css";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Rates = lazy(() => import("./pages/Rates"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const ExportPage = lazy(() => import("./pages/ExportPage"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  useEffect(() => {
    // Clear the app badge when the application is loaded
    clearBadge();

    // Also clear it when the app becomes visible/active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearBadge();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RegisterSW />
          <InstallPrompt />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth/*" element={<Auth />} />
                <Route path="/rates" element={<Rates />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
