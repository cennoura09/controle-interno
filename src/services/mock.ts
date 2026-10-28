// ============================================================================
// MockDataSource — implementação em memória do contrato DataSource.
// ----------------------------------------------------------------------------
// Semeada com os dados de src/data/*. As criações (tarefas, lançamentos,
// contas, checklist, comentários...) persistem durante a sessão do navegador,
// para o protótipo parecer vivo. Nada aqui vai para o back-end — é só para
// desenvolvimento/demonstração.
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
/** No modo demo o "usuário logado" para histórico/comentários é o Founder. */
const DEMO_ACTOR = "u-founder";

/** Simula a ida ao servidor; devolve uma cópia para evitar mutação acidental. */
function respond<T>(value: T): Promise<T> {
  const copy = structuredClone(value);
  return LATENCY > 0
    ? new Promise((resolve) => setTimeout(() => resolve(copy), LATENCY))
    : Promise.resolve(copy);
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

interface StoredFile extends TaskFile {
  base64: string;
}

export class MockDataSource implements DataSource {
  // Estado mutável da sessão (começa a partir dos seeds).
  private users: User[] = structuredClone(USERS).map((u) => ({ ...u, active: true }));
  private tasks: Task[] = structuredClone(INITIAL_TASKS);
  private transactions: Transaction[] = structuredClone(TRANSACTIONS);
  private channels: ChannelPerformance[] = structuredClone(CHANNELS);
  private funnel: FunnelStage[] = structuredClone(FUNNEL);
  private trend: TrendPoint[] = structuredClone(LEADS_TREND);
  private settings: AppSettings = { inadimplencia: FINANCE_KPIS.inadimplencia };
  private checklist: (ChecklistItem & { taskId: string })[] = [];
  private comments: (TaskComment & { taskId: string })[] = [];
  private files: (StoredFile & { taskId: string })[] = [];
  private activity: ActivityEntry[] = [];
  private notifications: AppNotification[] = [];
  private seq = 1;

  private log(taskId: string, action: string) {
    const task = this.tasks.find((t) => t.id === taskId);
    this.activity.unshift({
      id: this.seq++,
      taskId,
      taskTitle: task?.title ?? "",
      actorId: DEMO_ACTOR,
      action,
      createdAt: now(),
    });
  }

  private withCounts(t: Task): Task {
    const items = this.checklist.filter((c) => c.taskId === t.id);
    return {
      ...t,
      checklistTotal: items.length,
      checklistDone: items.filter((c) => c.done).length,
      commentCount: this.comments.filter((c) => c.taskId === t.id).length,
      fileCount: this.files.filter((f) => f.taskId === t.id).length,
    };
  }

  private findTask(id: string): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Tarefa ${id} não encontrada`);
    return task;
  }

  // ---- Equipe / usuários ----
  listUsers(): Promise<User[]> {
    return respond(this.users);
  }

  createUser(input: NewUser): Promise<User> {
    const user: User = {
      id: uid("u"),
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

  heartbeat(): Promise<void> {
    this.users = this.users.map((u) => (u.id === DEMO_ACTOR ? { ...u, lastSeenAt: now() } : u));
    return respond(undefined);
  }

  updateProfile(name: string, title: string): Promise<User> {
    return this.patchUser(DEMO_ACTOR, { name, title, initials: deriveInitials(name) });
  }

  updateUser(id: string, patch: Partial<Pick<User, "name" | "title" | "role" | "sector">>): Promise<User> {
    return this.patchUser(id, {
      ...patch,
      ...(patch.name ? { initials: deriveInitials(patch.name) } : {}),
    });
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
    return respond(this.tasks.map((t) => this.withCounts(t)));
  }

  createTasks(inputs: NewTask[]): Promise<Task[]> {
    const created: Task[] = inputs.map((input) => ({
      id: uid("t"),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: input.status ?? "todo",
      priority: input.priority,
      sector: input.sector,
      assigneeId: input.assigneeId,
      createdById: input.createdById,
      dueDate: input.dueDate || undefined,
      createdAt: today(),
      tags: input.tags ?? [],
    }));
    this.tasks = [...created, ...this.tasks];
    created.forEach((t) => this.log(t.id, "criou a tarefa"));
    return respond(created.map((t) => this.withCounts(t)));
  }

  updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.updateTask(id, { status });
  }

  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    try {
      const task = this.findTask(id);
      const next: Task = {
        ...task,
        ...patch,
        dueDate: patch.dueDate === null ? undefined : patch.dueDate ?? task.dueDate,
        updatedAt: now(),
      };
      if (patch.status && patch.status !== task.status) {
        next.completedAt = patch.status === "done" ? now() : undefined;
        this.log(id, `moveu para ${{ todo: "A fazer", doing: "Em andamento", done: "Concluída" }[patch.status]}`);
      }
      this.tasks = this.tasks.map((t) => (t.id === id ? next : t));
      return respond(this.withCounts(next));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  deleteTask(id: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return respond(undefined);
  }

  getTaskDetail(id: string): Promise<TaskDetail> {
    try {
      const task = this.findTask(id);
      return respond({
        task: this.withCounts(task),
        checklist: this.checklist.filter((c) => c.taskId === id),
        comments: this.comments.filter((c) => c.taskId === id),
        files: this.files
          .filter((f) => f.taskId === id)
          .map(({ base64: _base64, taskId: _taskId, ...meta }) => meta),
        activity: this.activity.filter((a) => a.taskId === id),
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  addChecklistItem(
    taskId: string,
    input: { text: string; dueDate?: string; assigneeId?: string }
  ): Promise<ChecklistItem> {
    const item = { id: uid("c"), taskId, text: input.text.trim(), done: false, dueDate: input.dueDate, assigneeId: input.assigneeId };
    this.checklist.push(item);
    this.log(taskId, `adicionou "${item.text}" ao checklist`);
    return respond(item);
  }

  updateChecklistItem(id: string, patch: ChecklistPatch): Promise<ChecklistItem> {
    const item = this.checklist.find((c) => c.id === id);
    if (!item) return Promise.reject(new Error("Item não encontrado"));
    Object.assign(item, {
      ...patch,
      dueDate: patch.dueDate === null ? undefined : patch.dueDate ?? item.dueDate,
      assigneeId: patch.assigneeId === null ? undefined : patch.assigneeId ?? item.assigneeId,
    });
    if (patch.done !== undefined) this.log(item.taskId, `${item.done ? "concluiu" : "reabriu"} "${item.text}"`);
    return respond(item);
  }

  deleteChecklistItem(id: string): Promise<void> {
    this.checklist = this.checklist.filter((c) => c.id !== id);
    return respond(undefined);
  }

  addComment(taskId: string, body: string): Promise<TaskComment> {
    const comment = { id: uid("m"), taskId, authorId: DEMO_ACTOR, body: body.trim(), createdAt: now() };
    this.comments.push(comment);
    this.log(taskId, "comentou");
    return respond(comment);
  }

  deleteComment(id: string): Promise<void> {
    this.comments = this.comments.filter((c) => c.id !== id);
    return respond(undefined);
  }

  uploadFile(taskId: string, file: FilePayload): Promise<TaskFile> {
    const stored = {
      id: uid("f"),
      taskId,
      name: file.name,
      mime: file.mime,
      size: Math.floor((file.base64.length * 3) / 4),
      uploaderId: DEMO_ACTOR,
      createdAt: now(),
      base64: file.base64,
    };
    this.files.push(stored);
    this.log(taskId, `anexou ${file.name}`);
    const { base64: _base64, taskId: _taskId, ...meta } = stored;
    return respond(meta);
  }

  getFile(id: string): Promise<FilePayload> {
    const f = this.files.find((x) => x.id === id);
    if (!f) return Promise.reject(new Error("Arquivo não encontrado"));
    return respond({ name: f.name, mime: f.mime, base64: f.base64 });
  }

  deleteFile(id: string): Promise<void> {
    this.files = this.files.filter((f) => f.id !== id);
    return respond(undefined);
  }

  recentActivity(limit = 20): Promise<ActivityEntry[]> {
    return respond(this.activity.slice(0, limit));
  }

  // ---- Notificações ----
  listNotifications(): Promise<AppNotification[]> {
    return respond(this.notifications);
  }

  markNotificationsRead(ids?: number[]): Promise<void> {
    this.notifications = this.notifications.map((n) =>
      !ids || ids.includes(n.id) ? { ...n, read: true } : n
    );
    return respond(undefined);
  }

  // ---- Financeiro ----
  getFinanceKpis(): Promise<FinanceKpis> {
    return respond({ ...FINANCE_KPIS, inadimplencia: this.settings.inadimplencia ?? 0 });
  }

  getRevenueSeries(): Promise<MonthlyPoint[]> {
    return respond(REVENUE_SERIES);
  }

  listTransactions(): Promise<Transaction[]> {
    return respond(this.transactions);
  }

  createTransaction(input: NewTransaction): Promise<Transaction> {
    const tx: Transaction = {
      id: uid("f"),
      date: input.date || today(),
      description: input.description.trim(),
      category: input.category.trim() || "Outros",
      type: input.type,
      amount: input.amount,
      source: input.source || "manual",
    };
    this.transactions = [tx, ...this.transactions];
    return respond(tx);
  }

  deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    return respond(undefined);
  }

  getSettings(): Promise<AppSettings> {
    return respond(this.settings);
  }

  setSetting(key: string, value: number): Promise<AppSettings> {
    this.settings = { ...this.settings, [key]: value };
    return respond(this.settings);
  }

  // ---- Marketing ----
  getMarketingKpis(): Promise<MarketingKpis> {
    return respond(MARKETING_KPIS);
  }

  listChannels(): Promise<ChannelPerformance[]> {
    return respond(this.channels);
  }

  getFunnel(): Promise<FunnelStage[]> {
    return respond(this.funnel);
  }

  getLeadsTrend(): Promise<TrendPoint[]> {
    return respond(this.trend);
  }

  upsertChannel(input: ChannelInput): Promise<ChannelPerformance> {
    const channel: ChannelPerformance = { ...input, id: input.id || uid("c") };
    const exists = this.channels.some((c) => c.id === channel.id);
    this.channels = exists
      ? this.channels.map((c) => (c.id === channel.id ? channel : c))
      : [...this.channels, channel];
    return respond(channel);
  }

  deleteChannel(id: string): Promise<void> {
    this.channels = this.channels.filter((c) => c.id !== id);
    return respond(undefined);
  }

  setFunnel(stages: FunnelStage[]): Promise<FunnelStage[]> {
    this.funnel = stages.filter((s) => s.stage.trim());
    return respond(this.funnel);
  }

  setLeadsDay(day: string, value: number): Promise<TrendPoint[]> {
    const label = day.slice(8, 10);
    const rest = this.trend.filter((p) => p.day !== label);
    this.trend = [...rest, { day: label, value }].sort((a, b) => a.day.localeCompare(b.day));
    return respond(this.trend);
  }
}
