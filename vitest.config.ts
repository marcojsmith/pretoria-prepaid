import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

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
        lines: 93,
        functions: 89,
        branches: 85,
        statements: 93,
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
