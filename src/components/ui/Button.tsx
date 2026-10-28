import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#FF6A14] to-[#F25500] text-white font-semibold hover:brightness-110 shadow-button",
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
