import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-2">{icon}</div>}
      <div className="text-sm font-medium text-muted">{title}</div>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted-2">{description}</p>
      )}
    </div>
  );
}
