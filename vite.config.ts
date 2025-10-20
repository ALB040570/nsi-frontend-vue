/** Файл: vite.config.ts
 *  Назначение: конфигурация Vite с dev-прокси и алиасами слоёв приложения.
 *  Использование: считывается сборщиком при запуске dev/production серверов.
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type PluginOption, type ProxyOptions } from 'vite'
import type { Server as ProxyServer } from 'http-proxy'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProxyBase(value: string | undefined): string {
  if (!value) {
    return '/api'
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return '/api'
  }

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const withoutTrailing = withLeading.replace(/\/+$/, '')
  return withoutTrailing || '/'
}

function normalizeRewriteBase(pathname: string): string {
  if (!pathname) {
    return '/'
  }

  const withoutTrailing = pathname.replace(/\/+$/, '')
  return withoutTrailing || '/'
}

function withMetaProxyGuards(options: ProxyOptions): ProxyOptions {
  const originalConfigure = options.configure

  return {
    ...options,
    configure(proxyServer: ProxyServer, proxyOptions) {
      proxyServer.on('proxyReq', (proxyReq) => {
        if (typeof proxyReq.removeHeader === 'function') {
          proxyReq.removeHeader('cookie')
        } else if (typeof proxyReq.setHeader === 'function') {
          proxyReq.setHeader('cookie', '')
        }
      })

      proxyServer.on('proxyRes', (proxyRes) => {
        if (proxyRes.headers['set-cookie']) {
          delete proxyRes.headers['set-cookie']
        }
      })

      if (typeof originalConfigure === 'function') {
        originalConfigure(proxyServer, proxyOptions)
      }
    },
  }
}

function createProxyConfig(env: Record<string, string>): Record<string, ProxyOptions> {
  const proxies: Record<string, ProxyOptions> = {}

  // 1) Основной API (NSI)
  const apiProxyBase = normalizeProxyBase(env.VITE_API_DEV_PROXY_BASE)
  const rawApiBase = env.VITE_API_BASE?.trim()

  if (rawApiBase && ABSOLUTE_URL_PATTERN.test(rawApiBase)) {
    try {
      const apiURL = new URL(rawApiBase)
      const target = `${apiURL.protocol}//${apiURL.host}`
      const rewriteBase = normalizeRewriteBase(apiURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(apiProxyBase)}`)

      proxies[apiProxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore parse failures and fall back to the default proxy below
    }
  }

  if (!proxies[apiProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(apiProxyBase)}`)
    proxies[apiProxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/nsi/api'),
    }
  }

  // 2) Meta API
  const metaProxyBase = normalizeProxyBase(env.VITE_META_DEV_PROXY_BASE || '/meta-api')
  const rawMetaBase = env.VITE_META_API_BASE?.trim()

  if (rawMetaBase && ABSOLUTE_URL_PATTERN.test(rawMetaBase)) {
    try {
      const metaURL = new URL(rawMetaBase)
      const target = `${metaURL.protocol}//${metaURL.host}`
      const rewriteBase = normalizeRewriteBase(metaURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(metaProxyBase)}`)

      proxies[metaProxyBase] = withMetaProxyGuards({
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      })
    } catch {
      // Ignore
    }
  }

  if (!proxies[metaProxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(metaProxyBase)}`)
    proxies[metaProxyBase] = withMetaProxyGuards({
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/meta/api'),
    })
  }

  return proxies
}

async function resolvePwaPlugin(): Promise<PluginOption | null> {
  try {
    const mod = await import('vite-plugin-pwa')
    if (typeof mod?.VitePWA !== 'function') return null
    return mod.VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // у тебя своя регистрация через pwa.ts — норм
      devOptions: { enabled: false }, // <— ДОБАВЬ ЭТО
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'NSI',
        short_name: 'NSI',
        start_url: '/dtj/nsi/',
        display: 'standalone',
        background_color: '#006d77',
        theme_color: '#006d77',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`[vite-config] vite-plugin-pwa unavailable: ${reason}`)
    return null
  }
}

// https://vite.dev/config/

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pwaPlugin = await resolvePwaPlugin()

  const plugins: PluginOption[] = [vue(), vueDevTools()]
  if (pwaPlugin) plugins.push(pwaPlugin)

  return {
    plugins,
    base: '/dtj/nsi/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      },
    },
    server: {
      proxy: createProxyConfig(env),
    },
  }
})
