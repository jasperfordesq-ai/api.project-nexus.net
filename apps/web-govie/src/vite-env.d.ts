/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_TENANT_SLUG: string
  readonly VITE_FEATURE_AI: string
  readonly VITE_FEATURE_PASSKEYS: string
  readonly VITE_FEATURE_FEDERATION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
