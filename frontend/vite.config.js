import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cấu hình Vite + proxy API sang backend Express
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Lắng nghe trên mọi địa chỉ (IPv4 + IPv6) để ngrok / mạng LAN truy cập được
    host: true,
    // Cho phép truy cập qua ngrok / tên miền tùy ý (.ngrok-free.dev, .ngrok.io, ...)
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io", ".ngrok.app"],
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
