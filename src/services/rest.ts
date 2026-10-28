// ============================================================================
// RestDataSource — fala com a API do back-end (sem dependências extras: fetch).
// ----------------------------------------------------------------------------
// Alternativa ao Supabase para um back-end próprio. O back-end expõe os
// endpoints abaixo; cada um devolve exatamente os tipos de src/lib/types.ts.
// O mapeamento tabela ↔ JSON está em db/supabase/*.sql.
//
// Ative com:  VITE_DATA_SOURCE=rest  e  VITE_API_URL=https://sua-api
//
// IMPORTANTE (segurança): as permissões em src/lib/permissions.ts refletem o
// que a UI mostra, mas DEVEM ser revalidadas no servidor em cada endpoint de
// escrita.
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
import type { DataSource } from "./datasource";

export class RestDataSource implements DataSource {
  constructor(private readonly baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include", // envia cookies de sessão/autenticação
      ...init,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${init?.method ?? "GET"} ${path} falhou: ${res.status} ${body}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private send<T>(method: string, path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]> {
    return this.request<User[]>("/api/users");
  }

  createUser(input: NewUser): Promise<User> {
    return this.send<User>("POST", "/api/users", input);
  }

  heartbeat(): Promise<void> {
    return this.send<void>("POST", "/api/me/heartbeat");
  }

  updateProfile(name: string, title: string): Promise<User> {
    return this.send<User>("PATCH", "/api/me", { name, title });
  }

  updateUser(id: string, patch: Partial<Pick<User, "name" | "title" | "role" | "sector">>): Promise<User> {
    return this.send<User>("PATCH", `/api/users/${id}`, patch);
  }

  setUserActive(id: string, active: boolean): Promise<User> {
    return this.send<User>("PATCH", `/api/users/${id}/active`, { active });
  }

  setUserLogin(id: string, email: string, password: string): Promise<User> {
    return this.send<User>("PUT", `/api/users/${id}/login`, { email, password });
  }

  // ---- Tarefas ----
  listTasks(): Promise<Task[]> {
    return this.request<Task[]>("/api/tasks");
  }

  createTasks(inputs: NewTask[]): Promise<Task[]> {
    // O servidor cria uma tarefa por item e devolve as criadas.
    return this.send<Task[]>("POST", "/api/tasks", inputs);
  }

  updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.send<Task>("PATCH", `/api/tasks/${id}/status`, { status });
  }

  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return this.send<Task>("PATCH", `/api/tasks/${id}`, patch);
  }

  deleteTask(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/tasks/${id}`);
  }

  getTaskDetail(id: string): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/api/tasks/${id}`);
  }

  addChecklistItem(
    taskId: string,
    input: { text: string; dueDate?: string; assigneeId?: string }
  ): Promise<ChecklistItem> {
    return this.send<ChecklistItem>("POST", `/api/tasks/${taskId}/checklist`, input);
  }

  updateChecklistItem(id: string, patch: ChecklistPatch): Promise<ChecklistItem> {
    return this.send<ChecklistItem>("PATCH", `/api/checklist/${id}`, patch);
  }

  deleteChecklistItem(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/checklist/${id}`);
  }

  addComment(taskId: string, body: string): Promise<TaskComment> {
    return this.send<TaskComment>("POST", `/api/tasks/${taskId}/comments`, { body });
  }

  deleteComment(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/comments/${id}`);
  }

  uploadFile(taskId: string, file: FilePayload): Promise<TaskFile> {
    return this.send<TaskFile>("POST", `/api/tasks/${taskId}/files`, file);
  }

  addLink(taskId: string, url: string, title?: string): Promise<TaskFile> {
    return this.send<TaskFile>("POST", `/api/tasks/${taskId}/links`, { url, title });
  }

  getFile(id: string): Promise<FilePayload> {
    return this.request<FilePayload>(`/api/files/${id}`);
  }

  deleteFile(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/files/${id}`);
  }

  recentActivity(limit = 20): Promise<ActivityEntry[]> {
    return this.request<ActivityEntry[]>(`/api/activity?limit=${limit}`);
  }

  // ---- Notificações ----
  listNotifications(): Promise<AppNotification[]> {
    return this.request<AppNotification[]>("/api/notifications");
  }

  markNotificationsRead(ids?: number[]): Promise<void> {
    return this.send<void>("POST", "/api/notifications/read", { ids });
  }

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis> {
    return this.request<FinanceKpis>("/api/finance/kpis");
  }

  getRevenueSeries(): Promise<MonthlyPoint[]> {
    return this.request<MonthlyPoint[]>("/api/finance/revenue-series");
  }

  listTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/api/finance/transactions");
  }

  createTransaction(input: NewTransaction): Promise<Transaction> {
    return this.send<Transaction>("POST", "/api/finance/transactions", input);
  }

  deleteTransaction(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/finance/transactions/${id}`);
  }

  getSettings(): Promise<AppSettings> {
    return this.request<AppSettings>("/api/settings");
  }

  setSetting(key: string, value: number): Promise<AppSettings> {
    return this.send<AppSettings>("PUT", `/api/settings/${key}`, { value });
  }

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis> {
    return this.request<MarketingKpis>("/api/marketing/kpis");
  }

  listChannels(): Promise<ChannelPerformance[]> {
    return this.request<ChannelPerformance[]>("/api/marketing/channels");
  }

  getFunnel(): Promise<FunnelStage[]> {
    return this.request<FunnelStage[]>("/api/marketing/funnel");
  }

  getLeadsTrend(): Promise<TrendPoint[]> {
    return this.request<TrendPoint[]>("/api/marketing/leads-trend");
  }

  upsertChannel(input: ChannelInput): Promise<ChannelPerformance> {
    return this.send<ChannelPerformance>("PUT", "/api/marketing/channels", input);
  }

  deleteChannel(id: string): Promise<void> {
    return this.send<void>("DELETE", `/api/marketing/channels/${id}`);
  }

  setFunnel(stages: FunnelStage[]): Promise<FunnelStage[]> {
    return this.send<FunnelStage[]>("PUT", "/api/marketing/funnel", stages);
  }

  setLeadsDay(day: string, value: number): Promise<TrendPoint[]> {
    return this.send<TrendPoint[]>("PUT", `/api/marketing/leads-trend/${day}`, { value });
  }
}
