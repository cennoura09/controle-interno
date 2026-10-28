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
    <Card className="flex min-w-0 flex-col gap-2.5 p-4 sm:gap-3 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <SectionLabel index={index} className="min-w-0" hideIndexOnMobile>{label}</SectionLabel>
        {delta && (
          <span className="hidden shrink-0 sm:inline">
            <DeltaPill value={delta} invert={deltaInvert} />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="mono-num truncate text-[24px] font-semibold leading-none tracking-tight text-white sm:text-3xl">
          {value}
        </div>
        {sub && <div className="mt-1.5 truncate text-[12.5px] text-muted sm:text-sm">{sub}</div>}
        {delta && (
          <div className="mt-2 sm:hidden">
            <DeltaPill value={delta} invert={deltaInvert} />
          </div>
        )}
      </div>
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </Card>
  );
}
