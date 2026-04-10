import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  plugins: [
    react(),
    (basicSsl as () => PluginOption)(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: ["favicon.ico", "robots.txt", "icons/*.png"],
      manifest: {
        name: "Pretoria Prepaid",
        short_name: "Prepaid",
        description: "Calculate and track your prepaid electricity costs in Pretoria.",
        id: "/",
        scope: "/",
        theme_color: "#000000",
        background_color: "#000000",
        start_url: "/dashboard",
        display: "standalone",
        icons: [
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (["react", "react-dom", "react-router-dom"].some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
            return "vendor-react";
          }
          if (["@tanstack/react-query", "framer-motion", "lucide-react"].some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
            return "vendor-utils";
          }
          if (id.includes("/node_modules/@clerk/clerk-react/")) {
            return "vendor-clerk";
          }
          if (id.includes("/node_modules/convex/")) {
            return "vendor-convex";
          }
        },
      },
    },
  },
});
