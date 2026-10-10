import type { ReactNode } from "react";
import { Card, SectionLabel } from "./Card";
import { DeltaPill } from "./Badge";

export function StatCard({
  index,
  label,
  value,
  sub,
  delta,
  deltaInvert,
  footer,
}: {
  index?: string;
  label: string;
  value: string;
  sub?: string;
  /** texto já formatado, ex.: "+14,2%" */
  delta?: string;
  deltaInvert?: boolean;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <SectionLabel index={index}>{label}</SectionLabel>
        {delta && <DeltaPill value={delta} invert={deltaInvert} />}
      </div>
      <div>
        <div className="mono-num text-3xl font-semibold leading-none tracking-tight">
          {value}
        </div>
        {sub && <div className="mt-1.5 text-sm text-muted">{sub}</div>}
      </div>
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </Card>
  );
}
