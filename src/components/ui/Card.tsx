import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Padding padrão só quando quem usa não define o próprio (p-0, p-4...).
  const customPadding = /(^|s)(sm:|lg:)?p-d/.test(className ?? "");
  return <div className={cn("card", !customPadding && "p-4 sm:p-5", className)}>{children}</div>;
}

/** Label no estilo da referência: "01 // VOLUME TOTAL". */
export function SectionLabel({
  index,
  children,
  className,
  hideIndexOnMobile = false,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
  /** Esconde o "01 //" no celular para sobrar espaço ao texto. */
  hideIndexOnMobile?: boolean;
}) {
  return (
    <div className={cn("mono-label flex min-w-0 items-center gap-1.5 text-[10.5px] sm:text-[11px]", className)}>
      {index && <span className={cn("text-accent", hideIndexOnMobile && "hidden sm:inline")}>{index}</span>}
      {index && <span className={cn("text-muted-2", hideIndexOnMobile && "hidden sm:inline")}>//</span>}
      <span className="truncate">{children}</span>
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
