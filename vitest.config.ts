import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { version } from "./package.json";

/**
 * Coverage floors, set just below current levels so coverage cannot regress.
 * Raise these as coverage improves; never lower them to make a PR pass.
 */
const SRC_LINES = 93;
const SRC_FUNCTIONS = 91;
const SRC_BRANCHES = 84;
const SRC_STATEMENTS = 92;

const CONVEX_LINES = 88;
const CONVEX_FUNCTIONS = 89;
const CONVEX_BRANCHES = 71;
const CONVEX_STATEMENTS = 85;

const SRC_COVERAGE_THRESHOLDS = {
  lines: SRC_LINES,
  functions: SRC_FUNCTIONS,
  branches: SRC_BRANCHES,
  statements: SRC_STATEMENTS,
};

const CONVEX_COVERAGE_THRESHOLDS = {
  lines: CONVEX_LINES,
  functions: CONVEX_FUNCTIONS,
  branches: CONVEX_BRANCHES,
  statements: CONVEX_STATEMENTS,
};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    pool: "forks",
    isolate: true,
    projects: [
      {
        extends: true,
        test: {
          name: "default",
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "vitest.setup.ts",
        "convex/_generated/**",
        "convex/**/*.test.ts",
        "convex/crons.ts",
        "src/components/ui/**",
        "src/main.tsx",
        "src/App.tsx",
        "src/vite-env.d.ts",
        "src/test/mocks/**",
      ],
      all: true,
      include: ["src/**/*.{ts,tsx}", "convex/**/*.ts"],
      thresholds: {
        "src/**": SRC_COVERAGE_THRESHOLDS,
        "convex/**": CONVEX_COVERAGE_THRESHOLDS,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "virtual:pwa-register/react": path.resolve(__dirname, "src/test/mocks/pwa-register.ts"),
    },
  },
});
