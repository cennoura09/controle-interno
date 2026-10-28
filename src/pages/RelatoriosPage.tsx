import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, SectionLabel } from "../components/ui/Card";
import { Avatar } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { useSession } from "../context/SessionContext";
import { useTasks } from "../context/TasksContext";
import { data } from "../services";
import { useAsync } from "../lib/useAsync";
import { PRIORITIES, PRIORITY_META, SECTORS } from "../lib/labels";
import { daysUntil } from "../lib/dates";
import { axisNumber, brl, num, pct, ratio } from "../lib/format";
import { downloadCsv } from "../lib/csv";
import { cn } from "../lib/cn";

type Tab = "tarefas" | "financeiro" | "marketing";

const TOOLTIP = { background: "#141416", border: "1px solid #27272B", borderRadius: 10, fontSize: 12 };

export function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("tarefas");
  return (
    <div className="space-y-7">
      <PageHeader
        title="Relatórios"
        description="Indicadores consolidados da operação, com exportação em CSV para planilhas."
        shortDescription="Indicadores e exportação em CSV."
      />
      <div className="grid h-12 w-full grid-cols-3 items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 sm:flex sm:h-[54px] sm:w-fit">
        {(["tarefas", "financeiro", "marketing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-full rounded-xl px-3 text-[14px] capitalize transition-all sm:px-5 sm:text-[15px]",
              tab === t ? "bg-gradient-to-b from-[#FF6A14] to-[#F25500] font-medium text-white" : "text-[#D4D4D8] hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "tarefas" && <TasksReport />}
      {tab === "financeiro" && <FinanceReport />}
      {tab === "marketing" && <MarketingReport />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card min-w-0 p-3.5 sm:p-4 lg:p-5">
      <div className="mono-label truncate text-[10px] sm:text-[10.5px]">{label}</div>
      <div className="mono-num mt-2 truncate text-[22px] font-semibold leading-none text-white sm:text-[26px]">{value}</div>
      {sub && <div className="mt-1.5 truncate text-[12px] text-muted sm:text-[12.5px]">{sub}</div>}
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-white">
      <Download size={13} /> CSV
    </button>
  );
}

function TasksReport() {
  const { tasks } = useTasks();
  const { allUsers } = useSession();
  const done = tasks.filter((t) => t.status === "done");
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
  const lead = done
    .filter((t) => t.completedAt)
    .map((t) => (new Date(t.completedAt!).getTime() - new Date(t.createdAt + "T00:00:00").getTime()) / 86_400_000);
  const avgLead = lead.length ? lead.reduce((a, b) => a + b, 0) / lead.length : 0;

  const sectorData = SECTORS.map((s) => ({
    setor: s,
    "A fazer": tasks.filter((t) => t.sector === s && t.status === "todo").length,
    "Em andamento": tasks.filter((t) => t.sector === s && t.status === "doing").length,
    Concluídas: tasks.filter((t) => t.sector === s && t.status === "done").length,
  })).filter((d) => d["A fazer"] + d["Em andamento"] + d.Concluídas > 0);

  const people = useMemo(
    () =>
      allUsers
        .map((u) => {
          const mine = tasks.filter((t) => t.assigneeId === u.id);
          return {
            user: u,
            total: mine.length,
            open: mine.filter((t) => t.status !== "done").length,
            done: mine.filter((t) => t.status === "done").length,
            overdue: mine.filter((t) => t.status !== "done" && t.dueDate && daysUntil(t.dueDate) < 0).length,
          };
        })
        .filter((p) => p.total > 0)
        .sort((a, b) => b.open - a.open),
    [allUsers, tasks]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tarefas" value={num(tasks.length)} sub={`${open.length} abertas`} />
        <Stat label="Taxa de conclusão" value={pct(ratio(done.length, tasks.length), 0)} sub={`${done.length} concluídas`} />
        <Stat label="Atrasadas" value={num(overdue.length)} sub="abertas com prazo vencido" />
        <Stat label="Tempo médio" value={`${avgLead.toFixed(1).replace(".", ",")} d`} sub="da criação à conclusão" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionLabel index="01">Tarefas por setor e status</SectionLabel>
          <div className="mt-4 h-56 sm:h-64">
            {sectorData.length === 0 ? (
              <p className="pt-10 text-center text-sm text-muted">Sem tarefas ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} maxBarSize={64}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272B" vertical={false} />
                  <XAxis dataKey="setor" stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="A fazer" stackId="a" fill="#FF5C00" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Em andamento" stackId="a" fill="#FF8A1F" />
                  <Bar dataKey="Concluídas" stackId="a" fill="#34D399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <SectionLabel index="02">Abertas por prioridade</SectionLabel>
          <div className="mt-4 space-y-4">
            {PRIORITIES.slice().reverse().map((p) => {
              const count = open.filter((t) => t.priority === p).length;
              return (
                <div key={p}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className={cn("flex items-center gap-2", PRIORITY_META[p].text)}>
                      <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[p].dot)} />
                      {PRIORITY_META[p].label}
                    </span>
                    <span className="font-mono text-xs text-muted">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={cn("h-full rounded-full", PRIORITY_META[p].dot)} style={{ width: `${ratio(count, open.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <SectionLabel index="03">Por responsável</SectionLabel>
          <ExportButton
            onClick={() =>
              downloadCsv("relatorio-tarefas-pessoas", [
                ["Pessoa", "Cargo", "Setor", "Total", "Abertas", "Concluídas", "Atrasadas"],
                ...people.map((p) => [p.user.name, p.user.role, p.user.sector, p.total, p.open, p.done, p.overdue]),
              ])
            }
          />
        </div>
        <ul className="border-t border-border sm:hidden">
          {people.map((p) => (
            <li key={p.user.id} className="border-b border-border-soft px-4 py-3.5 last:border-0">
              <div className="flex items-center gap-3">
                <Avatar initials={p.user.initials} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-white">{p.user.name}</span>
                  <span className="block truncate text-[12px] text-muted">{p.user.role} · {p.user.sector}</span>
                </span>
                <span className="mono-num text-[13px] text-muted">{pct(ratio(p.done, p.total), 0)}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-accent" style={{ width: `${ratio(p.done, p.total) * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-[12px] text-muted">
                <span><span className="mono-num text-white">{p.open}</span> abertas</span>
                <span><span className="mono-num text-success">{p.done}</span> concluídas</span>
                <span><span className={cn("mono-num", p.overdue > 0 ? "text-danger" : "text-white")}>{p.overdue}</span> atrasadas</span>
              </div>
            </li>
          ))}
          {people.length === 0 && <li className="px-4 py-10 text-center text-[13.5px] text-muted">Sem tarefas atribuídas ainda.</li>}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-y border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Pessoa</th>
                <th className="px-5 py-2.5 text-right font-medium">Abertas</th>
                <th className="px-5 py-2.5 text-right font-medium">Concluídas</th>
                <th className="px-5 py-2.5 text-right font-medium">Atrasadas</th>
                <th className="px-5 py-2.5 font-medium">Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.user.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar initials={p.user.initials} size={28} />
                      <span>
                        <span className="block text-white">{p.user.name}</span>
                        <span className="text-[11px] text-muted">{p.user.role} · {p.user.sector}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{p.open}</td>
                  <td className="px-5 py-3 text-right font-mono text-success">{p.done}</td>
                  <td className={cn("px-5 py-3 text-right font-mono", p.overdue > 0 && "text-danger")}>{p.overdue}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${ratio(p.done, p.total) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted">{pct(ratio(p.done, p.total), 0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Sem tarefas atribuídas ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FinanceReport() {
  const { data: loaded } = useAsync(
    () => Promise.all([data.listTransactions(), data.getRevenueSeries()]).then(([txs, series]) => ({ txs, series })),
    []
  );
  if (!loaded) return <Loading label="Carregando financeiro…" />;

  const categories = new Map<string, { receita: number; despesa: number }>();
  loaded.txs.forEach((t) => {
    const c = categories.get(t.category) ?? { receita: 0, despesa: 0 };
    c[t.type] += t.amount;
    categories.set(t.category, c);
  });
  const rows = [...categories.entries()].sort((a, b) => b[1].receita + b[1].despesa - (a[1].receita + a[1].despesa));
  const receita = loaded.txs.filter((t) => t.type === "receita").reduce((a, t) => a + t.amount, 0);
  const despesa = loaded.txs.filter((t) => t.type === "despesa").reduce((a, t) => a + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receitas (total)" value={brl(receita, { compact: true })} />
        <Stat label="Despesas (total)" value={brl(despesa, { compact: true })} />
        <Stat label="Resultado" value={brl(receita - despesa, { compact: true })} sub={`Margem ${pct(ratio(receita - despesa, receita))}`} />
        <Stat label="Lançamentos" value={num(loaded.txs.length)} />
      </div>
      <Card>
        <SectionLabel index="01">Receita × despesa por mês</SectionLabel>
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loaded.series} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} maxBarSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272B" vertical={false} />
              <XAxis dataKey="month" stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} width={40} allowDecimals={false} tickFormatter={axisNumber} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.03)" }} formatter={(v: number) => brl(v, { compact: true })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="#FF5C00" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <SectionLabel index="02">Por categoria</SectionLabel>
          <ExportButton
            onClick={() =>
              downloadCsv("relatorio-financeiro-categorias", [
                ["Categoria", "Receitas", "Despesas", "Saldo"],
                ...rows.map(([cat, v]) => [cat, v.receita, v.despesa, v.receita - v.despesa]),
              ])
            }
          />
        </div>
        <ul className="border-t border-border sm:hidden">
          {rows.map(([cat, v]) => (
            <li key={cat} className="border-b border-border-soft px-4 py-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[14.5px] font-medium text-white">{cat}</span>
                <span className={cn("mono-num shrink-0 text-[14px] font-semibold", v.receita - v.despesa >= 0 ? "text-white" : "text-danger")}>
                  {brl(v.receita - v.despesa, { compact: true })}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-[12px] text-muted">
                <span>Receitas <span className="mono-num text-success">{brl(v.receita, { compact: true })}</span></span>
                <span>Despesas <span className="mono-num text-danger">{brl(v.despesa, { compact: true })}</span></span>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="px-4 py-10 text-center text-[13.5px] text-muted">Nenhum lançamento ainda.</li>}
        </ul>
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-y border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted">
              <th className="px-5 py-2.5 font-medium">Categoria</th>
              <th className="px-5 py-2.5 text-right font-medium">Receitas</th>
              <th className="px-5 py-2.5 text-right font-medium">Despesas</th>
              <th className="px-5 py-2.5 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([cat, v]) => (
              <tr key={cat} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3 text-white">{cat}</td>
                <td className="px-5 py-3 text-right font-mono text-success">{brl(v.receita)}</td>
                <td className="px-5 py-3 text-right font-mono text-danger">{brl(v.despesa)}</td>
                <td className={cn("px-5 py-3 text-right font-mono", v.receita - v.despesa >= 0 ? "text-white" : "text-danger")}>{brl(v.receita - v.despesa)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted">Nenhum lançamento ainda.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MarketingReport() {
  const { data: loaded } = useAsync(() => Promise.all([data.listChannels(), data.getMarketingKpis()]).then(([channels, kpis]) => ({ channels, kpis })), []);
  if (!loaded) return <Loading label="Carregando marketing…" />;
  const { channels, kpis } = loaded;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads (mês)" value={num(kpis.leads)} />
        <Stat label="Investimento" value={brl(kpis.investimento, { compact: true })} />
        <Stat label="CAC" value={brl(kpis.cac)} />
        <Stat label="ROAS" value={`${kpis.roas.toFixed(1).replace(".", ",")}x`} />
      </div>
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <SectionLabel index="01">Eficiência por canal (mês)</SectionLabel>
          <ExportButton
            onClick={() =>
              downloadCsv("relatorio-marketing", [
                ["Canal", "Tipo", "Investido", "Leads", "Vendas", "Receita", "CPL", "Conversão", "ROAS"],
                ...channels.map((c) => [
                  c.channel, c.kind, c.invested, c.leads, c.sales, c.revenue,
                  c.leads ? (c.invested / c.leads).toFixed(2) : "", c.leads ? (c.sales / c.leads).toFixed(4) : "",
                  c.invested ? (c.revenue / c.invested).toFixed(2) : "",
                ]),
              ])
            }
          />
        </div>
        <ul className="border-t border-border sm:hidden">
          {channels.map((c) => (
            <li key={c.id} className="border-b border-border-soft px-4 py-3.5 last:border-0">
              <div className="truncate text-[14.5px] font-semibold text-white">{c.channel}</div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-muted">
                <div><div>CPL</div><div className="mono-num mt-0.5 text-[13px] text-white">{c.invested && c.leads ? brl(c.invested / c.leads, { compact: true }) : "—"}</div></div>
                <div><div>Conversão</div><div className="mono-num mt-0.5 text-[13px] text-white">{pct(ratio(c.sales, c.leads))}</div></div>
                <div><div>Ticket</div><div className="mono-num mt-0.5 text-[13px] text-white">{c.sales ? brl(c.revenue / c.sales, { compact: true }) : "—"}</div></div>
                <div><div>ROAS</div><div className="mono-num mt-0.5 text-[13px] text-accent">{c.invested ? `${(c.revenue / c.invested).toFixed(1).replace(".", ",")}x` : "—"}</div></div>
              </div>
            </li>
          ))}
          {channels.length === 0 && <li className="px-4 py-10 text-center text-[13.5px] text-muted">Nenhum canal lançado neste mês.</li>}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Canal</th>
                <th className="px-5 py-2.5 text-right font-medium">CPL</th>
                <th className="px-5 py-2.5 text-right font-medium">Conversão</th>
                <th className="px-5 py-2.5 text-right font-medium">Ticket</th>
                <th className="px-5 py-2.5 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3 text-white">{c.channel}</td>
                  <td className="px-5 py-3 text-right font-mono">{c.invested && c.leads ? brl(c.invested / c.leads) : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono">{pct(ratio(c.sales, c.leads))}</td>
                  <td className="px-5 py-3 text-right font-mono">{c.sales ? brl(c.revenue / c.sales, { compact: true }) : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-accent">{c.invested ? `${(c.revenue / c.invested).toFixed(1).replace(".", ",")}x` : "—"}</td>
                </tr>
              ))}
              {channels.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Nenhum canal lançado neste mês.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
