// ============================================================================
// MockDataSource — implementação em memória do contrato DataSource.
// ----------------------------------------------------------------------------
// Semeada com os dados de src/data/*. As criações (tarefas, lançamentos,
// contas) persistem durante a sessão do navegador, para o protótipo parecer
// vivo. Nada aqui vai para o back-end — é só para desenvolvimento/demonstração.
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
import { deriveInitials } from "./datasource";
import { USERS } from "../data/users";
import { INITIAL_TASKS } from "../data/tasks";
import { FINANCE_KPIS, REVENUE_SERIES, TRANSACTIONS } from "../data/finance";
import {
  MARKETING_KPIS,
  CHANNELS,
  FUNNEL,
  LEADS_TREND,
} from "../data/marketing";

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY ?? 0);

/** Simula a ida ao servidor; devolve uma cópia para evitar mutação acidental. */
function respond<T>(value: T): Promise<T> {
  const copy = structuredClone(value);
  return LATENCY > 0
    ? new Promise((resolve) => setTimeout(() => resolve(copy), LATENCY))
    : Promise.resolve(copy);
}

export class MockDataSource implements DataSource {
  // Estado mutável da sessão (começa a partir dos seeds).
  private users: User[] = structuredClone(USERS);
  private tasks: Task[] = structuredClone(INITIAL_TASKS);
  private transactions: Transaction[] = structuredClone(TRANSACTIONS);

  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]> {
    return respond(this.users);
  }

  createUser(input: NewUser): Promise<User> {
    const user: User = {
      id: `u-${Date.now()}`,
      name: input.name.trim(),
      role: input.role,
      sector: input.sector,
      title: input.title?.trim() || input.role,
      initials: input.initials || deriveInitials(input.name),
      email: input.email || null,
      active: true,
    };
    this.users = [...this.users, user];
    return respond(user);
  }

  setUserActive(id: string, active: boolean): Promise<User> {
    return this.patchUser(id, { active });
  }

  setUserLogin(id: string, email: string): Promise<User> {
    const current = this.users.find((u) => u.id === id);
    return this.patchUser(id, { email: current?.email || email });
  }

  private patchUser(id: string, patch: Partial<User>): Promise<User> {
    this.users = this.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    const updated = this.users.find((u) => u.id === id);
    if (!updated) return Promise.reject(new Error(`Membro ${id} não encontrado`));
    return respond(updated);
  }

  // ---- Tarefas ----
  listTasks(): Promise<Task[]> {
    return respond(this.tasks);
  }

  createTasks(inputs: NewTask[]): Promise<Task[]> {
    const now = Date.now();
    const createdAt = new Date().toISOString().slice(0, 10);
    const created: Task[] = inputs.map((input, i) => ({
      id: `t-${now}-${i}`,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: "todo",
      priority: input.priority,
      sector: input.sector,
      assigneeId: input.assigneeId,
      createdById: input.createdById,
      dueDate: input.dueDate || undefined,
      createdAt,
    }));
    this.tasks = [...created, ...this.tasks];
    return respond(created);
  }

  updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, status } : t));
    const updated = this.tasks.find((t) => t.id === id);
    if (!updated) return Promise.reject(new Error(`Tarefa ${id} não encontrada`));
    return respond(updated);
  }

  deleteTask(id: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return respond(undefined);
  }

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis> {
    return respond(FINANCE_KPIS);
  }

  getRevenueSeries(): Promise<MonthlyPoint[]> {
    return respond(REVENUE_SERIES);
  }

  listTransactions(): Promise<Transaction[]> {
    return respond(this.transactions);
  }

  createTransaction(input: NewTransaction): Promise<Transaction> {
    const tx: Transaction = {
      id: `f-${Date.now()}`,
      date: input.date || new Date().toISOString().slice(0, 10),
      description: input.description.trim(),
      category: input.category.trim() || "Outros",
      type: input.type,
      amount: input.amount,
      source: input.source || "manual",
    };
    this.transactions = [tx, ...this.transactions];
    return respond(tx);
  }

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis> {
    return respond(MARKETING_KPIS);
  }

  listChannels(): Promise<ChannelPerformance[]> {
    return respond(CHANNELS);
  }

  getFunnel(): Promise<FunnelStage[]> {
    return respond(FUNNEL);
  }

  getLeadsTrend(): Promise<TrendPoint[]> {
    return respond(LEADS_TREND);
  }
}
