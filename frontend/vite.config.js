import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: ["react-helmet-async"]
  },

  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          helmet: ["react-helmet-async"],
          socket: ["socket.io-client"]
        }
      }
    }
  }
});