import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['@tanstack/react-query', 'framer-motion', 'lucide-react'],
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-convex': ['convex'],
        }
      }
    }
  }
});
