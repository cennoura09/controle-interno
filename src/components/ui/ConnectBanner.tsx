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
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] p-3.5 sm:gap-4 sm:p-5">
        <div className="shrink-0 rounded-xl border border-accent/30 bg-bg/40 p-2 text-accent sm:self-start">
          <Plug size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-snug text-white sm:text-[15px]">{title}</div>
          <p className="mt-0.5 hidden text-sm text-muted sm:block">{description}</p>
          <div className="mt-1.5 flex gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,black_78%,transparent)] sm:mt-2 sm:flex-wrap sm:[mask-image:none]">
            {integrations.map((i) => (
              <span key={i} className="shrink-0 rounded-md border border-border bg-bg/50 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted sm:px-2 sm:text-[10px]">
                {i}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary shrink-0 gap-1.5 px-3.5 py-2 text-[13px] sm:px-4 sm:text-sm">
          {action} <ArrowRight size={15} className="hidden sm:block" />
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
