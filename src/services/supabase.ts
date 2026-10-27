// ============================================================================
// SupabaseDataSource — produção: Supabase Auth + Edge Function.
// ----------------------------------------------------------------------------
// O login é feito pelo Supabase Auth (e-mail/senha ou link mágico). Toda
// leitura/escrita vai para a Edge Function `controle-interno`
// (supabase/functions/controle-interno), que valida o token e chama as funções
// public.ci_* do banco — onde as permissões são revalidadas
// (db/supabase/001_schema.sql).
//
// Ative com:
//   VITE_DATA_SOURCE=supabase
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<publishable/anon key>
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

  async deleteTask(id: string): Promise<void> {
    await this.call<null>("ci_delete_task", { id });
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
}
