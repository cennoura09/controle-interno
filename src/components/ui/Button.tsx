import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-black font-medium hover:bg-accent-hover shadow-[0_6px_20px_-8px_rgba(255,92,0,0.6)]",
  secondary:
    "bg-surface-2 text-content border border-border hover:border-muted-2 hover:bg-surface-3",
  ghost: "text-muted hover:text-content hover:bg-surface-2",
};

export function Button({
  variant = "secondary",
  icon,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
