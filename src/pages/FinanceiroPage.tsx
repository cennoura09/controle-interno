import { useMemo, useState } from "react";
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
import { Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, SectionHeader, SectionLabel } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConnectBanner } from "../components/ui/ConnectBanner";
import {
  FINANCE_KPIS as K,
  REVENUE_SERIES,
  TRANSACTIONS,
} from "../data/finance";
import type { Transaction, TransactionType } from "../lib/types";
import { brl, delta, pct, shortDate } from "../lib/format";

export function FinanceiroPage() {
  const [txs, setTxs] = useState<Transaction[]>(TRANSACTIONS);
  const [manualOpen, setManualOpen] = useState(false);

  const sorted = useMemo(
    () => [...txs].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [txs]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financeiro"
        description="Receitas, despesas e faturamento. Conecte seu gateway de pagamento ou lance manualmente."
        right={
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setManualOpen(true)}>
            Adicionar manualmente
          </Button>
        }
      />

      <ConnectBanner
        title="Conecte seu sistema de pagamento"
        description="Sincronize receitas e despesas automaticamente em tempo real."
        integrations={["Stripe", "Pagar.me", "Mercado Pago", "Asaas"]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index="01" label="FATURAMENTO (MÊS)" value={brl(K.faturamento, { compact: true })} sub="Receita bruta em Out/26" delta={delta(K.faturamentoDelta)} />
        <StatCard index="02" label="DESPESAS" value={brl(K.despesas, { compact: true })} sub="Custos + operação" delta={delta(K.despesasDelta)} deltaInvert />
        <StatCard index="03" label="LUCRO LÍQUIDO" value={brl(K.lucroLiquido, { compact: true })} sub={`Margem de ${pct(K.lucroLiquido / K.faturamento)}`} delta={delta(K.lucroDelta)} />
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
          <MiniRow label="Receita recorrente / total" value={pct(K.mrr / K.faturamento)} />
          <MiniRow label="Inadimplência" value={pct(K.inadimplencia)} tone="danger" />
          <div className="mt-auto rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
            Última sincronização via gateway há <span className="text-content">4 min</span>.
          </div>
        </Card>
      </div>

      {/* Transações */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-3">
          <SectionLabel index="07">TRANSAÇÕES RECENTES</SectionLabel>
          <span className="font-mono text-xs text-muted">{sorted.length} lançamentos</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ManualTxModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onAdd={(t) => setTxs((prev) => [t, ...prev])}
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

function ManualTxModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("receita");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!description.trim() || !value) return;
    onAdd({
      id: `f-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      description: description.trim(),
      category: category.trim() || "Outros",
      type,
      amount: value,
      source: "manual",
    });
    setDescription(""); setCategory(""); setAmount(""); setType("receita");
    onClose();
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
        <div>
          <label className={labelCls} htmlFor="m-amount">Valor (R$)</label>
          <input id="m-amount" className={fieldCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" required />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Adicionar</Button>
        </div>
      </form>
    </Modal>
  );
}
