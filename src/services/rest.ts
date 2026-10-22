// ============================================================================
// RestDataSource — fala com a API do back-end (sem dependências extras: fetch).
// ----------------------------------------------------------------------------
// Este é o ponto de conexão com o banco de dados real. O back-end expõe os
// endpoints abaixo; cada um devolve exatamente os tipos de src/lib/types.ts.
// O mapeamento tabela ↔ JSON está em db/schema.sql.
//
// Ative com:  VITE_DATA_SOURCE=rest  e  VITE_API_URL=https://sua-api
//
// IMPORTANTE (segurança): as permissões em src/lib/permissions.ts refletem o
// que a UI mostra, mas DEVEM ser revalidadas no servidor em cada endpoint de
// escrita (createTasks, createTransaction, createUser, updateTaskStatus).
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

  private post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(data) });
  }

  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]> {
    return this.request<User[]>("/api/users");
  }

  createUser(input: NewUser): Promise<User> {
    return this.post<User>("/api/users", input);
  }

  // ---- Tarefas ----
  listTasks(): Promise<Task[]> {
    return this.request<Task[]>("/api/tasks");
  }

  createTasks(inputs: NewTask[]): Promise<Task[]> {
    // O servidor cria uma tarefa por item e devolve as criadas.
    return this.post<Task[]>("/api/tasks", inputs);
  }

  updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.request<Task>(`/api/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
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
    return this.post<Transaction>("/api/finance/transactions", input);
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
}
