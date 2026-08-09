import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from a GitHub Pages project site: https://<user>.github.io/<BASE>/
// Override with VITE_BASE if the repo is ever renamed or moved to a custom domain.
const base = process.env.VITE_BASE ?? '/kaktus-cafe/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Kaktus Cafe',
        short_name: 'Kaktus Cafe',
        description: 'Personal knowledge app — tasks, projects, notes, meetings, people.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f1e9',
        theme_color: '#2c3a34',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the home-screen icon → straight into the capture sheet,
        // without loading Today first. `?new=` is read in App.tsx.
        shortcuts: [
          {
            name: 'New Task',
            short_name: 'Task',
            description: 'Capture a task',
            url: '?new=task',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'New Meeting',
            short_name: 'Meeting',
            description: 'Add a meeting',
            url: '?new=meeting',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // jpg/mp3 carry the Focus page's background and its two audio loops —
        // without them a session on a train would be silent and grey.
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,mp3}'],
        // Google Fonts must survive offline — the app is unusable-looking without Zilla Slab.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
