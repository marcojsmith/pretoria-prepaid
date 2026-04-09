import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const COVERAGE_THRESHOLD_LINES = 90;
const COVERAGE_THRESHOLD_FUNCTIONS = 90;
const COVERAGE_THRESHOLD_BRANCHES = 90;
const COVERAGE_THRESHOLD_STATEMENTS = 90;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: true,
      },
    },
    projects: [
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
        "convex/", 
        "src/components/ui/**", 
        "src/main.tsx",
        "src/App.tsx",
        "src/vite-env.d.ts",
        "src/test/mocks/**"
      ],
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: COVERAGE_THRESHOLD_LINES,
        functions: COVERAGE_THRESHOLD_FUNCTIONS,
        branches: COVERAGE_THRESHOLD_BRANCHES,
        statements: COVERAGE_THRESHOLD_STATEMENTS,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "virtual:pwa-register/react": path.resolve(__dirname, "src/test/mocks/pwa-register.ts"),
    },
  },
});
