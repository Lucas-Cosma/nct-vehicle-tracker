import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, forward /api calls to the Express server on port 3000
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
