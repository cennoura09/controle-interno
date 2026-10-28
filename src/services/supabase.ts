// ============================================================================
// SupabaseDataSource — produção: Supabase Auth + Edge Function.
// ----------------------------------------------------------------------------
// O login é feito pelo Supabase Auth (e-mail/senha ou link mágico). Toda
// leitura/escrita vai para a Edge Function `controle-interno`
// (supabase/functions/controle-interno), que valida o token e chama as funções
// public.ci_* do banco — onde as permissões são revalidadas
// (db/supabase/*.sql).
//
// Ative com:
//   VITE_DATA_SOURCE=supabase
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<publishable/anon key>
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

/** Erro devolvido pela API (status HTTP + mensagem em pt-BR). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export class SupabaseDataSource implements DataSource {
  readonly client: SupabaseClient;
  private readonly fnUrl: string;

  constructor(url: string, private readonly anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true },
    });
    this.fnUrl = `${url.replace(/\/+$/, "")}/functions/v1/controle-interno`;
  }

  /** Chama uma função `ci_*` pela Edge Function com o token da sessão. */
  private async call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data: auth } = await this.client.auth.getSession();
    const token = auth.session?.access_token;
    if (!token) throw new ApiError("Sessão expirada. Faça login novamente.", 401);

    const res = await fetch(this.fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fn, args }),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
    if (!res.ok) throw new ApiError(body.error ?? `Falha na operação (${res.status})`, res.status);
    return body.data as T;
  }

  // ---- Sessão ----
  me(): Promise<User> {
    return this.call<User>("ci_me");
  }

  async heartbeat(): Promise<void> {
    await this.call<null>("ci_heartbeat");
  }

  updateProfile(name: string, title: string): Promise<User> {
    return this.call<User>("ci_update_profile", { name, title });
  }

  updateUser(id: string, patch: Partial<Pick<User, "name" | "title" | "role" | "sector">>): Promise<User> {
    return this.call<User>("ci_update_user", { id, patch });
  }

  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]> {
    return this.call<User[]>("ci_list_users");
  }

  createUser(input: NewUser): Promise<User> {
    return this.call<User>("ci_create_user", { ...input });
  }

  setUserActive(id: string, active: boolean): Promise<User> {
    return this.call<User>("ci_set_user_active", { id, active });
  }

  setUserLogin(id: string, email: string, password: string): Promise<User> {
    return this.call<User>("ci_set_user_login", { id, email, password });
  }

  // ---- Tarefas ----
  listTasks(): Promise<Task[]> {
    return this.call<Task[]>("ci_list_tasks");
  }

  createTasks(inputs: NewTask[]): Promise<Task[]> {
    return this.call<Task[]>("ci_create_tasks", { tasks: inputs });
  }

  updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.call<Task>("ci_update_task_status", { id, status });
  }

  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return this.call<Task>("ci_update_task", { id, patch });
  }

  async deleteTask(id: string): Promise<void> {
    await this.call<null>("ci_delete_task", { id });
  }

  getTaskDetail(id: string): Promise<TaskDetail> {
    return this.call<TaskDetail>("ci_task_detail", { id });
  }

  addChecklistItem(
    taskId: string,
    input: { text: string; dueDate?: string; assigneeId?: string }
  ): Promise<ChecklistItem> {
    return this.call<ChecklistItem>("ci_add_checklist_item", { taskId, ...input });
  }

  updateChecklistItem(id: string, patch: ChecklistPatch): Promise<ChecklistItem> {
    return this.call<ChecklistItem>("ci_update_checklist_item", { id, patch });
  }

  async deleteChecklistItem(id: string): Promise<void> {
    await this.call<null>("ci_delete_checklist_item", { id });
  }

  addComment(taskId: string, body: string): Promise<TaskComment> {
    return this.call<TaskComment>("ci_add_comment", { taskId, body });
  }

  async deleteComment(id: string): Promise<void> {
    await this.call<null>("ci_delete_comment", { id });
  }

  uploadFile(taskId: string, file: FilePayload): Promise<TaskFile> {
    return this.call<TaskFile>("ci_upload_file", { taskId, ...file });
  }

  addLink(taskId: string, url: string, title?: string): Promise<TaskFile> {
    return this.call<TaskFile>("ci_add_link", { taskId, url, title });
  }

  getFile(id: string): Promise<FilePayload> {
    return this.call<FilePayload>("ci_get_file", { id });
  }

  async deleteFile(id: string): Promise<void> {
    await this.call<null>("ci_delete_file", { id });
  }

  recentActivity(limit = 20): Promise<ActivityEntry[]> {
    return this.call<ActivityEntry[]>("ci_recent_activity", { limit });
  }

  // ---- Notificações ----
  listNotifications(): Promise<AppNotification[]> {
    return this.call<AppNotification[]>("ci_notifications");
  }

  async markNotificationsRead(ids?: number[]): Promise<void> {
    await this.call<null>("ci_mark_notifications_read", ids ? { ids } : {});
  }

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis> {
    return this.call<FinanceKpis>("ci_finance_kpis");
  }

  getRevenueSeries(): Promise<MonthlyPoint[]> {
    return this.call<MonthlyPoint[]>("ci_revenue_series");
  }

  listTransactions(): Promise<Transaction[]> {
    return this.call<Transaction[]>("ci_list_transactions");
  }

  createTransaction(input: NewTransaction): Promise<Transaction> {
    return this.call<Transaction>("ci_create_transaction", { ...input });
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.call<null>("ci_delete_transaction", { id });
  }

  getSettings(): Promise<AppSettings> {
    return this.call<AppSettings>("ci_get_settings");
  }

  setSetting(key: string, value: number): Promise<AppSettings> {
    return this.call<AppSettings>("ci_set_setting", { key, value });
  }

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis> {
    return this.call<MarketingKpis>("ci_marketing_kpis");
  }

  listChannels(): Promise<ChannelPerformance[]> {
    return this.call<ChannelPerformance[]>("ci_list_channels");
  }

  getFunnel(): Promise<FunnelStage[]> {
    return this.call<FunnelStage[]>("ci_funnel");
  }

  getLeadsTrend(): Promise<TrendPoint[]> {
    return this.call<TrendPoint[]>("ci_leads_trend");
  }

  upsertChannel(input: ChannelInput): Promise<ChannelPerformance> {
    return this.call<ChannelPerformance>("ci_upsert_channel", { channel: input });
  }

  async deleteChannel(id: string): Promise<void> {
    await this.call<null>("ci_delete_channel", { id });
  }

  setFunnel(stages: FunnelStage[]): Promise<FunnelStage[]> {
    return this.call<FunnelStage[]>("ci_set_funnel", { stages });
  }

  setLeadsDay(day: string, value: number): Promise<TrendPoint[]> {
    return this.call<TrendPoint[]>("ci_set_leads_day", { day, value });
  }
}
