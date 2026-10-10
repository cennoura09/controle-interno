import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

/** Label no estilo da referência: "01 // VOLUME TOTAL". */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mono-label flex items-center gap-1.5", className)}>
      {index && <span className="text-accent">{index}</span>}
      {index && <span className="text-muted-2">//</span>}
      <span>{children}</span>
    </div>
  );
}

/** Cabeçalho de seção com título grande (display) + descrição. */
export function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}
