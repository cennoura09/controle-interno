// ============================================================================
// Seleção da fonte de dados ativa.
// ----------------------------------------------------------------------------
// Troque a fonte por variável de ambiente (ver .env.example):
//   VITE_DATA_SOURCE=mock   → dados em memória (padrão, dev/demo)
//   VITE_DATA_SOURCE=rest   → API do back-end em VITE_API_URL
//
// O app inteiro importa SOMENTE `data` daqui. Ao ligar o back-end, nada no
// front muda além do .env.
// ============================================================================

import type { DataSource } from "./datasource";
import { MockDataSource } from "./mock";
import { RestDataSource } from "./rest";

function createDataSource(): DataSource {
  const kind = import.meta.env.VITE_DATA_SOURCE ?? "mock";
  const apiUrl = import.meta.env.VITE_API_URL;

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

export type { DataSource } from "./datasource";
