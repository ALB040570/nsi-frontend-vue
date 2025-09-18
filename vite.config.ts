import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
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

function createProxyConfig(env: Record<string, string>): Record<string, ProxyOptions> {
  const proxyBase = normalizeProxyBase(env.VITE_API_DEV_PROXY_BASE)
  const rawApiBase = env.VITE_API_BASE?.trim()
  const proxies: Record<string, ProxyOptions> = {}

  if (rawApiBase && ABSOLUTE_URL_PATTERN.test(rawApiBase)) {
    try {
      const apiURL = new URL(rawApiBase)
      const target = `${apiURL.protocol}//${apiURL.host}`
      const rewriteBase = normalizeRewriteBase(apiURL.pathname)
      const pattern = new RegExp(`^${escapeForRegex(proxyBase)}`)

      proxies[proxyBase] = {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(pattern, rewriteBase),
      }
    } catch {
      // Ignore parse failures and fall back to the default proxy below
    }
  }

  if (!proxies[proxyBase]) {
    const pattern = new RegExp(`^${escapeForRegex(proxyBase)}`)
    proxies[proxyBase] = {
      target: 'http://45.8.116.32',
      changeOrigin: true,
      rewrite: (path) => path.replace(pattern, '/dtj/nsi/api'),
    }
  }

  return proxies
}

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: createProxyConfig(env),
    },
  }
})
