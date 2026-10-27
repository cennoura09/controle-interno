/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Qual fonte de dados o app usa: "mock" (padrão), "rest" ou "supabase". */
  readonly VITE_DATA_SOURCE?: "mock" | "rest" | "supabase";
  /** Base URL da API REST quando VITE_DATA_SOURCE="rest" (ex.: https://api.exemplo.com). */
  readonly VITE_API_URL?: string;
  /** URL do projeto Supabase quando VITE_DATA_SOURCE="supabase". */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave pública (publishable/anon) do Supabase. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Latência artificial (ms) do mock, para exercitar estados de carregamento. */
  readonly VITE_MOCK_LATENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
