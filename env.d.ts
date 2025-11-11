/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

/// <reference types="msw" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_DEV_PROXY_BASE?: string
  readonly VITE_RPC_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_META_API_BASE?: string
  readonly VITE_META_DEV_PROXY_BASE?: string
  readonly VITE_RESOURCE_API_BASE?: string
  readonly VITE_RESOURCE_DEV_PROXY_BASE?: string
  readonly VITE_REPORT_API_BASE?: string
  readonly VITE_REPORT_DEV_PROXY_BASE?: string
  readonly VITE_REPORT_LOAD_BASE?: string
  readonly VITE_REPORT_LOAD_DEV_PROXY_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
