import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Regel 5: vite.config.ts — Proxy-Konfiguration für lokale Entwicklung.
// In Production übernimmt Apache beide Proxys (kein Node.js, kein Vite).
export default defineConfig({
  base: '/belegbot/',
  plugins: [react()],
  server: {
    proxy: {
      // Regel 1: Supabase-Proxy lokal
      // /supabase/* → http://192.168.178.61:8000/*
      '/supabase': {
        target: 'http://192.168.178.61:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
        secure: false,
      },
      // Regel 2: Anthropic-API-Proxy lokal
      // /belegbot/anthropic-api/* → https://api.anthropic.com/*
      // API-Key wird hier serverseitig injiziert — NIEMALS im Frontend-Code!
      '/belegbot/anthropic-api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/belegbot\/anthropic-api/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('x-api-key', process.env.VITE_ANTHROPIC_API_KEY || '');
            proxyReq.setHeader('anthropic-version', '2023-06-01');
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
