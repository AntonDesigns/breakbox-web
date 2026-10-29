import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// In dev the app talks to the API through a same-origin "/api" that Vite proxies to the backend (see
// src/config.ts). That keeps the browser same-origin, so the app runs on any port without tripping the
// API's CORS lock (which only names the one known origin), and BreakBox can run even while another Vite
// app holds 5173. The proxy is dev-only; a production build still calls the real API origin from config.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5080', changeOrigin: true },
    },
  },
})
