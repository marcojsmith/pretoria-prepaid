import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

function getRequiredEnvVar(name: "VITE_CONVEX_URL" | "VITE_CLERK_PUBLISHABLE_KEY"): string {
  const value: unknown = (import.meta.env as Record<string, unknown>)[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

const CONVEX_URL = getRequiredEnvVar("VITE_CONVEX_URL");
const PUBLISHABLE_KEY = getRequiredEnvVar("VITE_CLERK_PUBLISHABLE_KEY");

const convex = new ConvexReactClient(CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ThemeProvider>
    </HelmetProvider>
  </ClerkProvider>
);
