/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Qual fonte de dados o app usa: "mock" (padrão) ou "rest". */
  readonly VITE_DATA_SOURCE?: "mock" | "rest";
  /** Base URL da API REST quando VITE_DATA_SOURCE="rest" (ex.: https://api.exemplo.com). */
  readonly VITE_API_URL?: string;
  /** Latência artificial (ms) do mock, para exercitar estados de carregamento. */
  readonly VITE_MOCK_LATENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
