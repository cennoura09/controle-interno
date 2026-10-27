// Helpers de formatação PT-BR.

export function brl(value: number, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 2,
  }).format(value);
}

export function num(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/** Divisão segura: 0 quando o denominador é 0 (ex.: mês sem faturamento). */
export function ratio(part: number, total: number): number {
  return total ? part / total : 0;
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

/** Variação com sinal (ex.: "+14,2%" / "-3,1%"). */
export function delta(value: number, digits = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

/** Data ISO (YYYY-MM-DD) -> "08 out". */
export function shortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}
