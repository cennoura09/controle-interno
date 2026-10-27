// ============================================================================
// Seleção da fonte de dados ativa.
// ----------------------------------------------------------------------------
// Troque a fonte por variável de ambiente (ver .env.example):
//   VITE_DATA_SOURCE=mock      → dados em memória (padrão, dev/demo)
//   VITE_DATA_SOURCE=rest      → API do back-end em VITE_API_URL
//   VITE_DATA_SOURCE=supabase  → Supabase Auth + Edge Function (produção)
//
// O app inteiro importa SOMENTE `data` (e `auth`) daqui. Ao ligar o back-end,
// nada no front muda além do .env.
// ============================================================================

import type { DataSource } from "./datasource";
import { MockDataSource } from "./mock";
import { RestDataSource } from "./rest";
import { SupabaseDataSource } from "./supabase";

function createDataSource(): DataSource {
  const kind = import.meta.env.VITE_DATA_SOURCE ?? "mock";
  const apiUrl = import.meta.env.VITE_API_URL;

  if (kind === "supabase") {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "VITE_DATA_SOURCE=supabase exige VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example)."
      );
    }
    return new SupabaseDataSource(url, key);
  }

  if (kind === "rest") {
    if (!apiUrl) {
      throw new Error(
        "VITE_DATA_SOURCE=rest exige VITE_API_URL definido (ver .env.example)."
      );
    }
    return new RestDataSource(apiUrl);
  }

  return new MockDataSource();
}

/** Instância única usada por todo o app. */
export const data: DataSource = createDataSource();

/**
 * Autenticação real (Supabase). `null` nos modos mock/rest, em que o usuário
 * atual vem do seletor "Simular cargo".
 */
export const auth: SupabaseDataSource | null =
  data instanceof SupabaseDataSource ? data : null;

export type { DataSource } from "./datasource";
