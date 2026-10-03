import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pages = process.env.PAGES === "1";
const base = pages ? "/Apiario/" : "/";

export default defineConfig({
  base,
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "favicon-32.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Apiario",
        short_name: "Apiario",
        description: "Cuaderno de explotación apícola. Los datos se quedan en este dispositivo.",
        id: base,
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f3efe4",
        theme_color: "#3f5c4a",
        lang: "es",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
      },
    }),
  ],
  server: { host: "0.0.0.0", port: 8080 },
});
