import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/cn";
import type { TaskPriority } from "../../lib/types";
import { PRIORITY_META } from "../../lib/labels";

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

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em]", c.text)}>
      <span className={cn("h-2 w-2 rounded-full", c.dot)} />
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
  online,
  title,
}: {
  initials: string;
  size?: number;
  className?: string;
  /** Mostra o indicador verde de presença. */
  online?: boolean;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-[#2A2A30] to-[#18181B] font-medium text-content",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      title={title ?? initials}
    >
      {initials}
      {online && (
        <span
          className="absolute -bottom-0 -right-0 rounded-full border-2 border-bg bg-success"
          style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }}
        />
      )}
    </span>
  );
}
