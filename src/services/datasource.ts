// ============================================================================
// Contrato de dados do app (data-access layer)
// ----------------------------------------------------------------------------
// Toda leitura/escrita do front passa por esta interface. O app NÃO importa
// mais os mocks diretamente — ele fala com uma implementação de `DataSource`.
//
// Hoje existem três implementações:
//   - MockDataSource  (src/services/mock.ts)  → dados em memória, padrão em dev.
//   - RestDataSource  (src/services/rest.ts)  → chama a API do back-end.
//   - SupabaseDataSource (src/services/supabase.ts) → Supabase Auth + Edge
//     Function `controle-interno` (produção).
//
// A seleção da implementação ativa fica em src/services/index.ts (via env).
// ============================================================================

import type {
  ActivityEntry,
  AppNotification,
  AppSettings,
  ChannelInput,
  ChannelPerformance,
  ChecklistItem,
  ChecklistPatch,
  FilePayload,
  FinanceKpis,
  FunnelStage,
  MarketingKpis,
  MonthlyPoint,
  NewTask,
  NewTransaction,
  NewUser,
  Task,
  TaskComment,
  TaskDetail,
  TaskFile,
  TaskPatch,
  TaskStatus,
  Transaction,
  TrendPoint,
  User,
} from "../lib/types";

export interface DataSource {
  // ---- Sessão / equipe ----
  listUsers(): Promise<User[]>;
  createUser(input: NewUser): Promise<User>;
  /** Marca o usuário atual como online. */
  heartbeat(): Promise<void>;
  /** Atualiza nome/cargo do próprio usuário. */
  updateProfile(name: string, title: string): Promise<User>;
  /** CEO/Founder: edita nome, cargo, função e setor de um membro. */
  updateUser(id: string, patch: Partial<Pick<User, "name" | "title" | "role" | "sector">>): Promise<User>;
  /** Admin supremo: ativa/desativa uma conta. */
  setUserActive(id: string, active: boolean): Promise<User>;
  /** Admin supremo: define a senha (e cria o login, se ainda não existir). */
  setUserLogin(id: string, email: string, password: string): Promise<User>;

  // ---- Tarefas ----
  listTasks(): Promise<Task[]>;
  createTasks(inputs: NewTask[]): Promise<Task[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  updateTask(id: string, patch: TaskPatch): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getTaskDetail(id: string): Promise<TaskDetail>;
  addChecklistItem(
    taskId: string,
    input: { text: string; dueDate?: string; assigneeId?: string }
  ): Promise<ChecklistItem>;
  updateChecklistItem(id: string, patch: ChecklistPatch): Promise<ChecklistItem>;
  deleteChecklistItem(id: string): Promise<void>;
  addComment(taskId: string, body: string): Promise<TaskComment>;
  deleteComment(id: string): Promise<void>;
  uploadFile(taskId: string, file: FilePayload): Promise<TaskFile>;
  /** Anexa um link (ex.: pasta do Drive, Figma) à tarefa. */
  addLink(taskId: string, url: string, title?: string): Promise<TaskFile>;
  getFile(id: string): Promise<FilePayload>;
  deleteFile(id: string): Promise<void>;
  recentActivity(limit?: number): Promise<ActivityEntry[]>;

  // ---- Notificações ----
  listNotifications(): Promise<AppNotification[]>;
  /** Sem ids, marca todas como lidas. */
  markNotificationsRead(ids?: number[]): Promise<void>;

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis>;
  getRevenueSeries(): Promise<MonthlyPoint[]>;
  listTransactions(): Promise<Transaction[]>;
  createTransaction(input: NewTransaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  getSettings(): Promise<AppSettings>;
  setSetting(key: string, value: number): Promise<AppSettings>;

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis>;
  listChannels(): Promise<ChannelPerformance[]>;
  getFunnel(): Promise<FunnelStage[]>;
  getLeadsTrend(): Promise<TrendPoint[]>;
  upsertChannel(input: ChannelInput): Promise<ChannelPerformance>;
  deleteChannel(id: string): Promise<void>;
  setFunnel(stages: FunnelStage[]): Promise<FunnelStage[]>;
  setLeadsDay(day: string, value: number): Promise<TrendPoint[]>;
}

/** Deriva iniciais a partir do nome (ex.: "Mariana Souza" -> "MS"). */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
