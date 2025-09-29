import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`
}

function normalizeProxyBase(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return '/api'
  }

  const withLeading = ensureLeadingSlash(trimmed)
  const withoutTrailing = stripTrailingSlashes(withLeading)
  return withoutTrailing || '/'
}

function normalizeUpstreamBase(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return ''
  }

  return stripTrailingSlashes(ensureLeadingSlash(trimmed))
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawTarget = env.VITE_DEV_BACKEND || 'http://localhost:8080'
  const proxyBase = normalizeProxyBase(env.VITE_API_DEV_PROXY_BASE)

  let target = rawTarget
  let upstreamPath = ''

  try {
    const parsed = new URL(rawTarget)
    target = `${parsed.protocol}//${parsed.host}`
    upstreamPath = stripTrailingSlashes(parsed.pathname)
  } catch {
    // rawTarget could be a proxy string; leave as provided
  }

  if (!upstreamPath || upstreamPath === '/') {
    upstreamPath = normalizeUpstreamBase(env.VITE_DEV_BACKEND_PATH)
  }

  let rewrite: ((path: string) => string) | undefined

  if (upstreamPath && upstreamPath !== proxyBase) {
    const pattern = new RegExp(`^${escapeForRegex(proxyBase)}`)
    const replacement = upstreamPath || '/'
    rewrite = (path: string) => path.replace(pattern, replacement)
  } else if (!upstreamPath && proxyBase !== '/api') {
    const pattern = new RegExp(`^${escapeForRegex(proxyBase)}`)
    rewrite = (path: string) => path.replace(pattern, '/')
  }

  return {
    plugins: [vue(), vueDevTools()],
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
      proxy: {
        [proxyBase]: {
          target,
          changeOrigin: true,
          secure: false,
          ...(rewrite ? { rewrite } : {}),
        },
      },
    },
  }
})