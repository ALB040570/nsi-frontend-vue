/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />



interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_DEV_PROXY_BASE?: string
  readonly VITE_RPC_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_META_API_BASE?: string
  readonly VITE_META_DEV_PROXY_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
