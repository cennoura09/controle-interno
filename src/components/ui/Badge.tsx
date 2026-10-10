import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/cn";
import type { TaskPriority } from "../../lib/types";

/** Pill de variação verde/vermelha (ex.: "▲ +18.4%"). */
export function DeltaPill({
  value,
  invert = false,
}: {
  /** texto já formatado, ex.: "+14,2%" */
  value: string;
  /** quando a queda é positiva (ex.: CPL, CAC), inverte a cor. */
  invert?: boolean;
}) {
  const isUp = value.trim().startsWith("+");
  const good = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
        good ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {value}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "info" | "danger";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-3 text-muted border-border",
    accent: "bg-accent-soft text-accent border-accent/30",
    success: "bg-success-soft text-success border-success/30",
    info: "bg-info/10 text-info border-info/30",
    danger: "bg-danger-soft text-danger border-danger/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; dot: string; text: string }
> = {
  baixa: { label: "Baixa", dot: "bg-muted-2", text: "text-muted" },
  media: { label: "Média", dot: "bg-info", text: "text-info" },
  alta: { label: "Alta", dot: "bg-accent", text: "text-accent" },
  urgente: { label: "Urgente", dot: "bg-danger", text: "text-danger" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider", c.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export function StatusDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

export function Avatar({
  initials,
  size = 28,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-3 font-mono font-medium text-content",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={initials}
    >
      {initials}
    </span>
  );
}
