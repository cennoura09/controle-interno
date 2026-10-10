import type { ReactNode } from "react";
import { Plug, ArrowRight } from "lucide-react";
import { Button } from "./Button";

/**
 * Banner de integração (placeholder — sem back-end no MVP).
 * Usado em Financeiro (gateway de pagamento) e Marketing (Ads/Analytics).
 */
export function ConnectBanner({
  title,
  description,
  integrations,
  action = "Conectar",
  secondary,
}: {
  title: string;
  description: string;
  integrations: string[];
  action?: string;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-dashed border-accent/40 bg-accent-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-accent/30 bg-bg/40 p-2 text-accent">
          <Plug size={18} />
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {integrations.map((i) => (
              <span
                key={i}
                className="rounded-md border border-border bg-bg/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {secondary}
        {/* Placeholder: a conexão real será implementada pelo back-end. */}
        <Button variant="primary" icon={<ArrowRight size={15} />} disabled title="Integração a cargo do back-end">
          {action}
        </Button>
      </div>
    </div>
  );
}
