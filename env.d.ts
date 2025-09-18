/// <reference types="vite/client" />



interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_DEV_PROXY_BASE?: string
  readonly VITE_RPC_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
