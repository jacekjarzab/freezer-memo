/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onOfflineReady?: () => void;
    onNeedRefresh?: () => void;
  }): () => Promise<void>;
}
/// <reference types="vite-plugin-pwa/client" />
