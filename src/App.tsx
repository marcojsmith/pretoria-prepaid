import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense, useEffect } from "react";
import RegisterSW from "@/components/RegisterSW";
import { InstallPrompt } from "@/components/InstallPrompt";
import { clearBadge } from "@/lib/push-notifications";
import "./App.css";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
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

function renderPublicRoutes() {
  return (
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}

function renderProtectedDashboard() {
  return (
    <>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rates"
        element={
          <ProtectedRoute>
            <Rates />
          </ProtectedRoute>
        }
      />
    </>
  );
}

function renderProtectedData() {
  return (
    <>
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calculator"
        element={
          <ProtectedRoute>
            <CalculatorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/export"
        element={
          <ProtectedRoute>
            <ExportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </>
  );
}

function renderProtectedRoutes() {
  return (
    <>
      {renderProtectedDashboard()}
      {renderProtectedData()}
    </>
  );
}

function renderAppRoutes() {
  return (
    <Routes>
      {renderPublicRoutes()}
      {renderProtectedRoutes()}
    </Routes>
  );
}

const App = () => {
  useEffect(() => {
    void clearBadge();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void clearBadge();
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
            <Suspense fallback={<LoadingFallback />}>{renderAppRoutes()}</Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
