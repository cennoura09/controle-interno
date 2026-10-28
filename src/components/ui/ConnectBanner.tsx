import { useState } from "react";
import { Plug, ArrowRight, KeyRound, PencilLine } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

/**
 * Banner de integração (Financeiro: gateway; Marketing: Ads/Analytics).
 * "Conectar" explica o que é preciso para ligar cada fonte e oferece o
 * lançamento manual enquanto a integração não está ativa.
 */
export function ConnectBanner({
  title,
  description,
  integrations,
  action = "Conectar",
  onManual,
  manualLabel = "Lançar manualmente",
}: {
  title: string;
  description: string;
  integrations: string[];
  action?: string;
  /** Abre o lançamento manual (se o usuário tiver permissão). */
  onManual?: () => void;
  manualLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(integrations[0]);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-accent/30 bg-bg/40 p-2 text-accent">
            <Plug size={18} />
          </div>
          <div>
            <div className="font-medium text-white">{title}</div>
            <p className="mt-0.5 text-sm text-muted">{description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {integrations.map((i) => (
                <span key={i} className="rounded-md border border-border bg-bg/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary shrink-0 px-4 py-2 text-sm">
          {action} <ArrowRight size={15} />
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={title} description="Escolha a fonte que deseja ligar ao painel.">
        <div className="grid grid-cols-2 gap-2">
          {integrations.map((i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                selected === i ? "border-accent/60 bg-accent/10 text-white" : "border-border text-muted hover:border-white/20"
              )}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
          <div className="flex items-start gap-2.5">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-accent" />
            <p>
              A sincronização com <span className="text-white">{selected}</span> usa as credenciais de API da conta da
              empresa. Gere a chave no painel do {selected} e envie ao admin do sistema para ativar a conexão — ela
              fica guardada no servidor, nunca no navegador.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <PencilLine size={16} className="mt-0.5 shrink-0 text-accent" />
            <p>Enquanto a conexão não estiver ativa, os números deste painel vêm dos lançamentos manuais.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          {onManual && (
            <Button
              variant="primary"
              onClick={() => {
                setOpen(false);
                onManual();
              }}
            >
              {manualLabel}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
