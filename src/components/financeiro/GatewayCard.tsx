import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Webhook,
  Check,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { data } from "../../services";
import type { GatewayStatus } from "../../lib/types";
import { relativeTime } from "../../lib/dates";
import { cn } from "../../lib/cn";

const SUPABASE_SECRETS_URL = "https://supabase.com/dashboard/project/uvjkyajjwxcuzllhqvcm/functions/secrets";
const MP_APPS_URL = "https://www.mercadopago.com.br/developers/panel/app";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Conexão com o Mercado Pago no Financeiro: mostra se está conectado,
 * sincroniza pagamentos/assinaturas e guia a configuração (credencial +
 * webhook). A credencial nunca passa pelo navegador: fica nos segredos do
 * Supabase.
 */
export function GatewayCard({
  canSync,
  onSynced,
  onManual,
}: {
  canSync: boolean;
  /** Recarrega os números da página depois de sincronizar. */
  onSynced: () => void;
  onManual?: () => void;
}) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const check = useCallback(() => {
    setChecking(true);
    data
      .gatewayStatus()
      .then(setStatus)
      .catch((e) => setMessage({ tone: "error", text: errMsg(e) }))
      .finally(() => setChecking(false));
  }, []);

  useEffect(check, [check]);

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const r = await data.syncGateway();
      const subs = r.subscriptions ? ` · ${r.subscriptions.active} assinatura(s) ativa(s)` : "";
      const out = r.statement?.saved ? ` · ${r.statement.saved} saída(s) do extrato` : "";
      setMessage({ tone: "ok", text: `Sincronizado: ${r.saved} pagamento(s) aprovado(s)${r.removed ? `, ${r.removed} removido(s)` : ""}${out}${subs}.` });
      onSynced();
      check();
    } catch (e) {
      setMessage({ tone: "error", text: errMsg(e) });
    } finally {
      setSyncing(false);
    }
  }

  const connected = status?.connected === true;

  // Saídas do extrato chegam com alguns minutos de atraso: ao abrir o Financeiro,
  // sincroniza sozinho se a última vez foi há mais de 30 minutos.
  const [autoSynced, setAutoSynced] = useState(false);
  useEffect(() => {
    if (autoSynced || !connected || !canSync || syncing) return;
    const last = status?.lastSync ? new Date(status.lastSync).getTime() : 0;
    if (Date.now() - last < 30 * 60_000) return;
    setAutoSynced(true);
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, canSync, status?.lastSync]);

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border p-3.5 sm:p-5",
          connected ? "border-success/30 bg-success/[0.05]" : "border-dashed border-accent/40 bg-accent/[0.06]"
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn("shrink-0 rounded-xl border p-2", connected ? "border-success/30 text-success" : "border-accent/30 text-accent")}>
            {connected ? <CheckCircle2 size={18} /> : <Plug size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[14px] font-medium text-white sm:text-[15px]">
              Mercado Pago
              {checking && !status ? (
                <span className="text-[12px] font-normal text-muted">verificando…</span>
              ) : connected ? (
                <span className="text-[12px] font-normal text-success">conectado{status?.account ? ` · ${status.account}` : ""}</span>
              ) : (
                <span className="text-[12px] font-normal text-accent">não conectado</span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-muted sm:text-sm">
              {connected
                ? `${status?.lastSync ? `Última sincronização ${relativeTime(status.lastSync)}` : "Ainda não sincronizado"}${
                    status?.activeSubscriptions != null ? ` · ${status.activeSubscriptions} assinatura(s) ativa(s)` : ""
                  }`
                : "Receitas, MRR e inadimplência automáticos a partir das assinaturas."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {connected && canSync && (
              <button onClick={() => void sync()} disabled={syncing} className="btn-primary gap-1.5 px-3.5 py-2 text-[13px] sm:text-sm">
                {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
            )}
            <button
              onClick={() => setSetupOpen(true)}
              className={cn(
                connected
                  ? "rounded-xl border border-white/10 px-3 py-2 text-[13px] text-muted hover:text-white"
                  : "btn-primary px-3.5 py-2 text-[13px] sm:text-sm"
              )}
            >
              {connected ? "Configurar" : "Conectar"}
            </button>
          </div>
        </div>
        {message && (
          <div className={cn("mt-3 rounded-lg px-3 py-2 text-[12.5px]", message.tone === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
            {message.text}
          </div>
        )}
      </div>

      <Modal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Conectar o Mercado Pago"
        description="Três passos, feitos uma vez. A credencial fica guardada no servidor — nunca no navegador."
      >
        <SetupSteps status={status} />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {onManual && !connected && (
            <Button
              variant="ghost"
              onClick={() => {
                setSetupOpen(false);
                onManual();
              }}
            >
              Lançar manualmente
            </Button>
          )}
          <Button variant="primary" onClick={check} disabled={checking}>
            {checking ? "Verificando…" : connected ? "Verificar de novo" : "Verificar conexão"}
          </Button>
        </div>
        {status && !connected && status.reason && (
          <p className="mt-3 text-right text-[12px] text-muted">{status.reason}</p>
        )}
      </Modal>
    </>
  );
}

function SetupSteps({ status }: { status: GatewayStatus | null }) {
  const connected = status?.connected === true;
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        done={connected}
        icon={<KeyRound size={16} />}
        title="Credencial de produção"
        body={
          <>
            No Mercado Pago, em <b className="text-white">Suas integrações → sua aplicação → Credenciais de produção</b>, copie o{" "}
            <b className="text-white">Access Token</b>. No Supabase, crie o segredo{" "}
            <code className="rounded bg-white/10 px-1 text-[12px] text-white">MP_ACCESS_TOKEN</code> com esse valor.
          </>
        }
        links={[
          { href: MP_APPS_URL, label: "Abrir Mercado Pago" },
          { href: SUPABASE_SECRETS_URL, label: "Abrir segredos do Supabase" },
        ]}
      />
      <Step
        n={2}
        icon={<Webhook size={16} />}
        title="Webhook (avisos em tempo real)"
        body={
          <>
            Na aplicação do Mercado Pago, em <b className="text-white">Webhooks → Configurar notificações → Modo produção</b>, cole a URL abaixo e
            marque os eventos <b className="text-white">Pagamentos</b> e <b className="text-white">Planos e assinaturas</b>.
          </>
        }
        copy={status?.webhookUrl}
      />
      <Step
        n={3}
        done={status?.webhookSigned}
        icon={<ShieldCheck size={16} />}
        title="Assinatura secreta (recomendado)"
        body={
          <>
            Ao salvar o webhook, o Mercado Pago mostra uma <b className="text-white">assinatura secreta</b>. Crie no Supabase o segredo{" "}
            <code className="rounded bg-white/10 px-1 text-[12px] text-white">MP_WEBHOOK_SECRET</code> com ela — assim só avisos legítimos são aceitos.
          </>
        }
        links={[{ href: SUPABASE_SECRETS_URL, label: "Abrir segredos do Supabase" }]}
      />
    </ol>
  );
}

function Step({
  n,
  done,
  icon,
  title,
  body,
  links,
  copy,
}: {
  n: number;
  done?: boolean;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  links?: { href: string; label: string }[];
  copy?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
            done ? "bg-success text-black" : "bg-accent/15 text-accent"
          )}
        >
          {done ? <Check size={13} strokeWidth={3} /> : n}
        </span>
        <span className="flex items-center gap-1.5 text-[14px] font-medium text-white">
          <span className="text-muted">{icon}</span>
          {title}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
      {copy && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/10 bg-bg px-2.5 py-2">
          <code className="min-w-0 flex-1 truncate text-[12px] text-white">{copy}</code>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(copy);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex shrink-0 items-center gap-1 text-[12px] text-accent"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}
      {links && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <a key={l.href + l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12.5px] text-accent hover:underline">
              {l.label} <ExternalLink size={12} />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
