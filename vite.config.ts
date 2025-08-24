import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// safely load Replit plugins with require (avoids ESM-only crash)
const runtimeErrorOverlay = require("@replit/vite-plugin-runtime-error-modal");
// cartographer is optional → load conditionally with require
const cartographer =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [require("@replit/vite-plugin-cartographer").cartographer()]
    : [];

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...cartographer,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
