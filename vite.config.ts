import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// In dev the app talks to the API through a same-origin "/api" that Vite proxies to the backend (see
// src/config.ts). That keeps the browser same-origin, so the app runs on any port without tripping the
// API's CORS lock (which only names the one known origin). The web and API ports are fixed to uncommon
// values (server.port below, and the API on 38080) so a locked-down network, e.g. a school or corporate
// one, is less likely to be holding them. The proxy is dev-only; a production build still calls the real
// API origin from config.
export default defineConfig({
  plugins: [react()],
  // The in-arena workbench pulls in @monaco-editor/react lazily. In dev, Vite can otherwise pre-bundle a
  // second React copy for that lazy chunk, which trips React's "Invalid hook call" guard. Deduping React and
  // pre-bundling the wrapper keeps one React instance, so the editor mounts clean. The production build already
  // dedupes, so this only matters for the dev server.
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['@monaco-editor/react'] },
  server: {
    // Fixed, uncommon ports so a locked-down network (school / corporate) is unlikely to be holding
    // them; strictPort makes dev.ps1 open the right URL instead of Vite silently drifting to 38174.
    // Keep these in step with dev.ps1, the API launch profile and the CORS origin in Program.cs.
    port: 38173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:38080', changeOrigin: true },
    },
  },
})
