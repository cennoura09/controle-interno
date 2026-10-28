// ============================================================================
// Tipos de domínio do Controle Interno
// ----------------------------------------------------------------------------
// Este arquivo define o "contrato" de dados do front-end. Quando o back-end
// entrar, os mocks em src/data/* serão trocados por chamadas de API que
// devolvem exatamente estes formatos.
// ============================================================================

/** Setores da empresa. "Executivo" agrupa CEO/Founder (acesso global). */
export type Sector =
  | "Marketing"
  | "Comercial"
  | "Financeiro"
  | "Operacional"
  | "Executivo";

/** Cargos. Diretores são C-level de um setor; CEO/Founder têm acesso total. */
export type Role =
  | "Founder"
  | "CEO"
  | "CMO" // diretor de Marketing
  | "CCO" // diretor Comercial
  | "CFO" // diretor Financeiro
  | "COO" // diretor Operacional
  | "Colaborador"; // funcionário comum de qualquer setor

export interface User {
  id: string;
  name: string;
  role: Role;
  sector: Sector;
  /** Cargo/descrição livre exibida na UI (ex.: "Analista de Tráfego"). */
  title: string;
  /** Iniciais para o avatar. */
  initials: string;
  /** E-mail de login (quando a pessoa tem acesso ao sistema). */
  email?: string | null;
  /** Admin supremo: acesso total, gerencia logins e pode "visualizar como". */
  isSuperAdmin?: boolean;
  /** Contas desativadas não entram no sistema nem recebem tarefas. */
  active?: boolean;
  /** Última atividade (ISO) — usado para "membros online". */
  lastSeenAt?: string | null;
}

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sector: Sector;
  /** Usuário responsável pela execução. */
  assigneeId: string;
  /** Quem criou/atribuiu a tarefa. */
  createdById: string;
  /** Data limite no formato ISO (YYYY-MM-DD). */
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  tags?: string[];
  checklistTotal?: number;
  checklistDone?: number;
  commentCount?: number;
  fileCount?: number;
}

/** Campos editáveis de uma tarefa (envio parcial). */
export interface TaskPatch {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  sector?: Sector;
  assigneeId?: string;
  dueDate?: string | null;
  tags?: string[];
  status?: TaskStatus;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string;
  assigneeId?: string;
}

export interface ChecklistPatch {
  text?: string;
  done?: boolean;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploaderId: string;
  createdAt: string;
}

/** Conteúdo de um anexo para download/upload. */
export interface FilePayload {
  name: string;
  mime: string;
  base64: string;
}

export interface TaskActivity {
  id: number;
  actorId?: string | null;
  action: string;
  createdAt: string;
}

/** Atividade com o título da tarefa (feed da Visão geral). */
export interface ActivityEntry extends TaskActivity {
  taskId: string;
  taskTitle: string;
}

export interface TaskDetail {
  task: Task;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  files: TaskFile[];
  activity: TaskActivity[];
}

export interface AppNotification {
  id: number;
  actorId?: string;
  taskId?: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------
export type TransactionType = "receita" | "despesa";
export type TransactionSource = "gateway" | "manual";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number; // em reais
  source: TransactionSource;
}

export interface MonthlyPoint {
  month: string; // "Jan", "Fev", ...
  receita: number;
  despesa: number;
}

// ---------------------------------------------------------------------------
// Marketing
// ---------------------------------------------------------------------------
export type ChannelKind = "organico" | "pago";

export interface ChannelPerformance {
  id: string;
  channel: string; // "Instagram", "Google Ads", ...
  kind: ChannelKind;
  invested: number; // R$ (0 para orgânico)
  leads: number;
  sales: number;
  revenue: number; // R$ gerado
}

/** Lançamento manual de um canal no mês corrente (id vazio = novo). */
export interface ChannelInput {
  id?: string;
  channel: string;
  kind: ChannelKind;
  invested: number;
  leads: number;
  sales: number;
  revenue: number;
}

export interface FunnelStage {
  stage: string;
  value: number;
}

export interface TrendPoint {
  day: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Agregados (KPIs) — o back-end pode calcular no servidor e devolver prontos.
// ---------------------------------------------------------------------------
export interface FinanceKpis {
  faturamento: number;
  faturamentoDelta: number;
  despesas: number;
  despesasDelta: number;
  lucroLiquido: number;
  lucroDelta: number;
  ticketMedio: number;
  ticketDelta: number;
  mrr: number;
  inadimplencia: number;
}

export interface MarketingKpis {
  leads: number;
  leadsDelta: number;
  cpl: number;
  cplDelta: number;
  investimento: number;
  investimentoDelta: number;
  roas: number;
  roasDelta: number;
  vendas: number;
  vendasDelta: number;
  cac: number;
  cacDelta: number;
  conversao: number;
  conversaoDelta: number;
}

// ---------------------------------------------------------------------------
// Payloads de criação — o que o front envia; id/datas/derivados são do servidor.
// ---------------------------------------------------------------------------
export interface NewUser {
  name: string;
  role: Role;
  sector: Sector;
  title?: string;
  initials?: string;
  /** Opcional: cria também o login (e-mail + senha, mín. 8 caracteres). */
  email?: string;
  password?: string;
}

export interface NewTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  sector: Sector;
  assigneeId: string;
  createdById: string;
  dueDate?: string;
  status?: TaskStatus;
  tags?: string[];
}

export interface NewTransaction {
  date?: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  source?: TransactionSource;
}

/** Indicadores configuráveis (ex.: inadimplência). */
export type AppSettings = Record<string, number>;
