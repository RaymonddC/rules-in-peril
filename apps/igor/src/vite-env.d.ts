/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by build-site.mjs: where the RIP front door is, relative to this app. Unset in dev. */
  readonly VITE_LANDING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
