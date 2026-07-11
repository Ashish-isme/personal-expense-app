import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, proxy /api to the local backend so the frontend can use
// relative URLs. In production the API base is set via VITE_API_URL.
// The dev proxy target defaults to the local backend on :4000, but can be
// overridden with VITE_PROXY_TARGET if you run the backend on another port.
const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
