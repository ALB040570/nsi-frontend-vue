// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function joinTarget(origin?: string, basePath?: string): string {
  const trimmedOrigin = (origin ?? '').replace(/\/+$/, '')
  const trimmedPath = (basePath ?? '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!trimmedOrigin) return trimmedPath ? `/${trimmedPath}` : ''
  if (!trimmedPath) return trimmedOrigin
  return `${trimmedOrigin}/${trimmedPath}`
}

export default defineConfig(({ mode }) => {
  // читаем все переменные из .env*
  const env = loadEnv(mode, process.cwd(), '')

  // Один раз формируем целевой URL бэкенда для dev-прокси
  // Приоритет:
  // 1) VITE_DEV_BACKEND + VITE_DEV_BACKEND_PATH (рекомендуется)
  // 2) VITE_API_BASE (если содержит полный путь вплоть до /dtj/nsi/api)
  const backendOrigin = env.VITE_DEV_BACKEND || ''
  const backendPath = env.VITE_DEV_BACKEND_PATH || ''
  const fallback = env.VITE_API_BASE || 'http://localhost:8000/dtj/nsi/api'
  const target = backendOrigin || backendPath ? joinTarget(backendOrigin, backendPath) : fallback

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
        // /auth/* -> <target>/auth/*
        '/auth': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p, // оставляем /auth как есть
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              const o = new URL(target).origin
              proxyReq.setHeader('origin', o)
              proxyReq.setHeader('referer', o + '/')
            })
          },
        },
        // /api/* -> <target>/*  (снимаем префикс /api)
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''), // /api/x -> /x
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              const o = new URL(target).origin
              proxyReq.setHeader('origin', o)
              proxyReq.setHeader('referer', o + '/')
            })
          },
        },
      },
    },
  }
})
