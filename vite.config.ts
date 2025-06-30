import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  preview: {
    port: parseInt(process.env.PORT ?? "4173", 10),
    host: "0.0.0.0",
    allowedHosts: ["aceinterview-6hiu.onrender.com"], // ✅ Add this line
  },
});
