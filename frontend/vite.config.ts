import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'icons/*.png'],
      manifest: {
        name: 'VR Digital Calling',
        short_name: 'VR Digital',
        description: 'AI Voice Agent for your business phone',
        theme_color: '#6C3AFF',
        background_color: '#09090B',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Required for Docker
    proxy: {
      // Proxy API requests to the backend during development
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Proxy WebSocket connections to the backend during development
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
