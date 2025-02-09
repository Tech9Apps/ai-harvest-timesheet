/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HARVEST_ACCESS_TOKEN: string
  readonly VITE_HARVEST_ACCOUNT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 