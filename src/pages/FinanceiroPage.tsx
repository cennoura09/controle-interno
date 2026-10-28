import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Plus, ArrowDownRight, ArrowUpRight, Lock, Trash2, Pencil, Download } from "lucide-react";
import { Card, SectionLabel } from "../components/ui/Card";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConnectBanner } from "../components/ui/ConnectBanner";
import { Loading, LoadError } from "../components/ui/Loading";
import { useSession } from "../context/SessionContext";
import { canRegisterFinance } from "../lib/permissions";
import { data } from "../services";
import { useAsync } from "../lib/useAsync";
import type { NewTransaction, TransactionType } from "../lib/types";

import { brl, delta, pct, ratio, shortDate } from "../lib/format";
import { downloadCsv } from "../lib/csv";

const MONTH_LABEL = new Date().toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

export function FinanceiroPage() {
  const { currentUser } = useSession();
  const canRegister = canRegisterFinance(currentUser);
  const [manualOpen, setManualOpen] = useState(false);

  const { data: loaded, loading, error, setData, reload } = useAsync(
    () =>
      Promise.all([
        data.getFinanceKpis(),
        data.getRevenueSeries(),
        data.listTransactions(),
      ]).then(([kpis, series, txs]) => ({ kpis, series, txs })),
    []
  );

  const [actionError, setActionError] = useState<string | null>(null);

  // KPIs e gráfico dependem dos lançamentos: recarrega tudo após escrever.
  async function addTransaction(input: NewTransaction) {
    await data.createTransaction(input);
    reload();
  }

  async function removeTransaction(id: string, label: string) {
    if (!window.confirm(`Excluir o lançamento "${label}"?`)) return;
    setData((prev) => (prev ? { ...prev, txs: prev.txs.filter((t) => t.id !== id) } : prev));
    try {
      setActionError(null);
      await data.deleteTransaction(id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      reload();
    }
  }

  async function editDefault(current: number) {
    const raw = window.prompt("Inadimplência atual (%)", (current * 100).toFixed(1).replace(".", ","));
    if (raw === null) return;
    const value = Number(raw.replace(",", ".").replace("%", ""));
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setActionError("Informe um percentual entre 0 e 100.");
      return;
    }
    try {
      setActionError(null);
      await data.setSetting("inadimplencia", value / 100);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function exportCsv() {
    if (!loaded) return;
    downloadCsv("financeiro", [
      ["Data", "Descrição", "Categoria", "Tipo", "Origem", "Valor"],
      ...loaded.txs.map((t) => [t.date, t.description, t.category, t.type, t.source, String(t.amount).replace(".", ",")]),
    ]);
  }

  const header = (
    <PageHeader
      title="Financeiro"
      description="Receitas, despesas e faturamento. Conecte seu gateway de pagamento ou lance manualmente."
      action={
        canRegister ? (
          <button onClick={() => setManualOpen(true)} className="btn-primary h-11 px-4 text-[15px] sm:h-[50px] sm:px-6 sm:text-[16px]">
            <Plus size={20} strokeWidth={2.25} /> Novo lançamento
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">
            <Lock size={13} />
            Lançamento manual restrito ao Financeiro
          </span>
        )
      }
    />
  );

  const banner = (
    <ConnectBanner
      title="Conecte seu sistema de pagamento"
      description="Sincronize receitas e despesas automaticamente em tempo real."
      integrations={["Stripe", "Pagar.me", "Mercado Pago", "Asaas"]}
      onManual={canRegister ? () => setManualOpen(true) : undefined}
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        {banner}
        <LoadError error={error} onRetry={reload} />
      </div>
    );
  }

  if (!loaded || loading) {
    return (
      <div className="space-y-6">
        {header}
        {banner}
        <Loading label="Carregando financeiro…" />
      </div>
    );
  }

  const K = loaded.kpis;
  const REVENUE_SERIES = loaded.series;
  const sorted = [...loaded.txs].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      {header}
      {banner}
      {actionError && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index="01" label="FATURAMENTO (MÊS)" value={brl(K.faturamento, { compact: true })} sub={`Receita bruta em ${MONTH_LABEL}`} delta={delta(K.faturamentoDelta)} />
        <StatCard index="02" label="DESPESAS" value={brl(K.despesas, { compact: true })} sub="Custos + operação" delta={delta(K.despesasDelta)} deltaInvert />
        <StatCard index="03" label="LUCRO LÍQUIDO" value={brl(K.lucroLiquido, { compact: true })} sub={`Margem de ${pct(ratio(K.lucroLiquido, K.faturamento))}`} delta={delta(K.lucroDelta)} />
        <StatCard index="04" label="TICKET MÉDIO" value={brl(K.ticketMedio, { compact: true })} sub="Por cliente" delta={delta(K.ticketDelta)} deltaInvert />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gráfico Receita x Despesa */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel index="05">RECEITA × DESPESA (6 MESES)</SectionLabel>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-accent"><span className="h-2 w-2 rounded-full bg-accent" />Receita</span>
              <span className="flex items-center gap-1.5 text-info"><span className="h-2 w-2 rounded-full bg-info" />Despesa</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_SERIES} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5C00" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF5C00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272B" vertical={false} />
                <XAxis dataKey="month" stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#141416", border: "1px solid #27272B", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "#8A8A90" }}
                  formatter={(v: number) => brl(v, { compact: true })}
                />
                <Legend wrapperStyle={{ display: "none" }} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#FF5C00" strokeWidth={2} fill="url(#gRec)" />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#3B82F6" strokeWidth={2} fill="url(#gDes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Mini indicadores */}
        <Card className="flex flex-col gap-4">
          <SectionLabel index="06">INDICADORES</SectionLabel>
          <MiniRow label="MRR" value={brl(K.mrr, { compact: true })} tone="accent" />
          <MiniRow label="Receita recorrente / total" value={pct(ratio(K.mrr, K.faturamento))} />
          <div className="flex items-center justify-between border-b border-border-soft pb-3">
            <span className="text-sm text-muted">Inadimplência</span>
            <span className="flex items-center gap-2">
              <span className="mono-num font-medium text-danger">{pct(K.inadimplencia)}</span>
              {canRegister && (
                <button onClick={() => void editDefault(K.inadimplencia)} className="rounded p-1 text-muted hover:text-white" aria-label="Editar inadimplência">
                  <Pencil size={13} />
                </button>
              )}
            </span>
          </div>
          <div className="mt-auto rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
            Nenhum gateway conectado — os valores vêm dos lançamentos manuais.
          </div>
        </Card>
      </div>

      {/* Transações */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-3">
          <SectionLabel index="07">TRANSAÇÕES RECENTES</SectionLabel>
          <span className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted">{sorted.length} lançamentos</span>
            <button onClick={exportCsv} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-white">
              <Download size={13} /> CSV
            </button>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Data</th>
                <th className="px-5 py-2.5 font-medium">Descrição</th>
                <th className="px-5 py-2.5 font-medium">Categoria</th>
                <th className="px-5 py-2.5 font-medium">Origem</th>
                <th className="px-5 py-2.5 text-right font-medium">Valor</th>
                {canRegister && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{shortDate(t.date)}</td>
                  <td className="px-5 py-3">{t.description}</td>
                  <td className="px-5 py-3 text-muted">{t.category}</td>
                  <td className="px-5 py-3">
                    <Badge tone={t.source === "gateway" ? "info" : "neutral"}>
                      {t.source === "gateway" ? "Gateway" : "Manual"}
                    </Badge>
                  </td>
                  <td className={"whitespace-nowrap px-5 py-3 text-right font-mono " + (t.type === "receita" ? "text-success" : "text-danger")}>
                    <span className="inline-flex items-center gap-1">
                      {t.type === "receita" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {t.type === "receita" ? "+" : "−"}{brl(t.amount)}
                    </span>
                  </td>
                  {canRegister && (
                    <td className="px-2 py-3">
                      <button onClick={() => void removeTransaction(t.id, t.description)} className="rounded p-1 text-muted hover:text-danger" aria-label={`Excluir ${t.description}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                    Nenhum lançamento ainda.{canRegister && " Use “Novo lançamento” para registrar receitas e despesas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ManualTxModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onAdd={addTransaction}
      />
    </div>
  );
}

function MiniRow({ label, value, tone }: { label: string; value: string; tone?: "accent" | "danger" }) {
  const color = tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-content";
  return (
    <div className="flex items-center justify-between border-b border-border-soft pb-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={"mono-num font-medium " + color}>{value}</span>
    </div>
  );
}

const fieldCls = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-content placeholder:text-muted-2 focus-ring";
const labelCls = "mono-label mb-1.5 block";

function ManualTxModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: NewTransaction) => Promise<void> | void }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("receita");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.includes(",") ? amount.replace(/\./g, "").replace(",", ".") : amount);
    if (!description.trim() || !value || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        description: description.trim(),
        category: category.trim() || "Outros",
        type,
        amount: value,
        date,
        source: "manual",
      });
      setDescription(""); setCategory(""); setAmount(""); setType("receita");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lançamento manual" description="Adicione uma receita ou despesa sem passar pelo gateway.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="m-desc">Descrição</label>
          <input id="m-desc" className={fieldCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Consultoria pontual" autoFocus required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="m-cat">Categoria</label>
            <input id="m-cat" className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Serviços" />
          </div>
          <div>
            <label className={labelCls} htmlFor="m-type">Tipo</label>
            <select id="m-type" className={fieldCls} value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="m-amount">Valor (R$)</label>
            <input id="m-amount" className={fieldCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" required />
          </div>
          <div>
            <label className={labelCls} htmlFor="m-date">Data</label>
            <input id="m-date" type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        {error && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Adicionando…" : "Adicionar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
