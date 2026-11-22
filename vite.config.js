import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app only calls the public /api/careers/* routes (yulo_backend/server/routes/careers.routes.js).
const BACKEND = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5178,
    proxy: {
      "/api": BACKEND,
    },
  },
  preview: {
    rewrites: [
      {
        source: "/(.*)",
        destination: "/index.html",
      },
    ],
  },
});
