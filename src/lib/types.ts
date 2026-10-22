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
}

export interface NewTask {
  title: string;
  description?: string;
  priority: TaskPriority;
  sector: Sector;
  assigneeId: string;
  createdById: string;
  dueDate?: string;
}

export interface NewTransaction {
  date?: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  source?: TransactionSource;
}
