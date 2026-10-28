// Helpers de data para tarefas (prazos, tempo relativo). Datas de tarefa são
// ISO "YYYY-MM-DD" interpretadas no fuso local.

/** Hoje em ISO local (YYYY-MM-DD). */
export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  return new Date(iso.slice(0, 10) + "T00:00:00");
}

/** Diferença em dias entre o prazo e hoje (negativo = atrasado). */
export function daysUntil(iso: string): number {
  const ms = parseISO(iso).getTime() - parseISO(todayISO()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Rótulo curto do prazo: "Hoje", "Amanhã", "Ontem", "28/10". */
export function dueLabel(iso?: string): string {
  if (!iso) return "-";
  const d = daysUntil(iso);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  const date = parseISO(iso);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Tom do prazo: atrasado (danger), hoje/amanhã (accent), normal. */
export function dueTone(iso?: string, done = false): "danger" | "accent" | "muted" {
  if (!iso || done) return "muted";
  const d = daysUntil(iso);
  if (d < 0) return "danger";
  if (d <= 1) return "accent";
  return "muted";
}

export function longDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("pt-BR");
}

/** "agora", "há 5 min", "há 2h", "há 3 dias", "12/10". */
export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86_400) {
    const days = Math.floor(diff / 86_400);
    return `há ${days} dia${days > 1 ? "s" : ""}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** "Out. De 2026" (como no widget da referência). */
export function monthYearLabel(d = new Date()): string {
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}. De ${d.getFullYear()}`;
}

/** Usuário ativo nos últimos 5 minutos. */
export function isOnline(lastSeenAt?: string | null): boolean {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 5 * 60_000;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
