// ============================================================================
// Contrato de dados do app (data-access layer)
// ----------------------------------------------------------------------------
// Toda leitura/escrita do front passa por esta interface. O app NÃO importa
// mais os mocks diretamente — ele fala com uma implementação de `DataSource`.
//
// Hoje existem duas implementações:
//   - MockDataSource  (src/services/mock.ts)  → dados em memória, padrão em dev.
//   - RestDataSource  (src/services/rest.ts)  → chama a API do back-end.
//   - SupabaseDataSource (src/services/supabase.ts) → Supabase Auth + Edge
//     Function `controle-interno` (produção).
//
// Para plugar o banco de dados real, o back-end só precisa expor os endpoints
// que o RestDataSource consome (ver src/services/rest.ts e db/schema.sql).
// A seleção da implementação ativa fica em src/services/index.ts (via env).
// ============================================================================

import type {
  ChannelPerformance,
  FinanceKpis,
  FunnelStage,
  MarketingKpis,
  MonthlyPoint,
  NewTask,
  NewTransaction,
  NewUser,
  Task,
  TaskStatus,
  Transaction,
  TrendPoint,
  User,
} from "../lib/types";

export interface DataSource {
  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]>;
  createUser(input: NewUser): Promise<User>;
  /** Admin supremo: ativa/desativa uma conta. */
  setUserActive(id: string, active: boolean): Promise<User>;
  /** Admin supremo: define a senha (e cria o login, se ainda não existir). */
  setUserLogin(id: string, email: string, password: string): Promise<User>;

  // ---- Tarefas ----
  listTasks(): Promise<Task[]>;
  createTasks(inputs: NewTask[]): Promise<Task[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis>;
  getRevenueSeries(): Promise<MonthlyPoint[]>;
  listTransactions(): Promise<Transaction[]>;
  createTransaction(input: NewTransaction): Promise<Transaction>;

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis>;
  listChannels(): Promise<ChannelPerformance[]>;
  getFunnel(): Promise<FunnelStage[]>;
  getLeadsTrend(): Promise<TrendPoint[]>;
}

/** Deriva iniciais a partir do nome (ex.: "Mariana Souza" -> "MS"). */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
