// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vite-pwa/nuxt'
  ],

  devtools: { enabled: false },

  app: {
    head: {
      title: 'Ignited',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0c0c14' },
        { name: 'description', content: 'Reproductor de música open-source.' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icons/pwa-192x192.png' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ignited',
      short_name: 'Ignited',
      description: 'Reproductor de música open-source',
      theme_color: '#0c0c14',
      background_color: '#0c0c14',
      display: 'standalone',
      start_url: '/',
      lang: 'es',
      icons: [
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: /\.(?:jpe?g|png|gif|webp|avif|svg)(?:\?[^#]*)?(?:#.*)?$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'ignited-artwork',
            cacheableResponse: { statuses: [0, 200] },
            expiration: {
              maxEntries: 400,
              maxAgeSeconds: 60 * 60 * 24 * 90,
              purgeOnQuotaError: true
            }
          }
        }
      ]
    },
    client: {
      installPrompt: true
    }
  }
})
