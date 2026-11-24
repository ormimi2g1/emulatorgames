/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Kids Adventure Arcade',
        short_name: 'Kids Arcade',
        description: 'Big Adventures for Little Heroes. A safe, ad-free family game arcade.',
        theme_color: '#101936',
        background_color: '#101936',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The retro console (EmulatorJS + cores, ~3.5 MB) is cached on first use instead of on install.
        globIgnores: ['emulatorjs/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/emulatorjs\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/emulatorjs/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'retro-console', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  // Phaser (lazy-loaded with the platformer) is one ~1.2 MB chunk; it is precached for offline play.
  build: { chunkSizeWarningLimit: 1400 },
  server: { port: 5000, host: '0.0.0.0', allowedHosts: true },
  preview: { port: 5000, host: '0.0.0.0', allowedHosts: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
