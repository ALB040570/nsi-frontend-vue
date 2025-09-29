import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

function joinTarget(origin: string | undefined, basePath: string | undefined): string {
  const trimmedOrigin = (origin ?? '').replace(/\/+$/, '')
  const trimmedPath = (basePath ?? '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!trimmedOrigin) {
    return trimmedPath ? `/${trimmedPath}` : ''
  }
  if (!trimmedPath) {
    return trimmedOrigin
  }
  return `${trimmedOrigin}/${trimmedPath}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = joinTarget(env.VITE_DEV_BACKEND, env.VITE_DEV_BACKEND_PATH)

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
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})