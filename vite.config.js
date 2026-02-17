import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
    //   manifest: {
    //     name: 'Trakby Field Tracker',
    //     short_name: 'Trakby',
    //     description: 'Standard operational procedure for field staff tracking',
    //     theme_color: '#ffffff',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     scope: '/',
    //     start_url: '/',
    //     orientation: 'portrait',
    //     icons: [
    //       {
    //         src: '/icon-192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icon-512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/leaflet/') || id.includes('/node_modules/react-leaflet/') || id.includes('/node_modules/@react-leaflet/')) return 'vendor-maps'
            if (id.includes('recharts')) return 'vendor-charts'
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase'
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'vendor-react'
            if (id.includes('lucide-react') || id.includes('@headlessui/react')) return 'vendor-ui'
            return 'vendor'
          }
        },
      },
    },
  },
})