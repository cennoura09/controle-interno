import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight, Clock, AlertTriangle, CheckCircle2, ListTodo, Wallet, Megaphone } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, SectionLabel } from "../components/ui/Card";
import { Avatar, PriorityBadge } from "../components/ui/Badge";
import { useSession } from "../context/SessionContext";
import { useTasks } from "../context/TasksContext";
import { useUI } from "../context/UIContext";
import { data } from "../services";
import { useAsync } from "../lib/useAsync";
import { SECTORS } from "../lib/labels";
import { daysUntil, dueLabel, dueTone, relativeTime } from "../lib/dates";
import { brl, num } from "../lib/format";
import { cn } from "../lib/cn";

export function VisaoGeralPage() {
  const { currentUser, allUsers } = useSession();
  const { tasks, openTask } = useTasks();
  const { openNewTask } = useUI();

  const { data: extra } = useAsync(
    () =>
      Promise.all([
        data.getFinanceKpis().catch(() => null),
        data.getRevenueSeries().catch(() => []),
        data.getMarketingKpis().catch(() => null),
        data.recentActivity(12).catch(() => []),
      ]).then(([finance, series, marketing, activity]) => ({ finance, series, marketing, activity })),
    [tasks.length]
  );

  const mine = useMemo(
    () =>
      tasks
        .filter((t) => t.assigneeId === currentUser.id && t.status !== "done")
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
    [tasks, currentUser.id]
  );
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
  const month = new Date().toISOString().slice(0, 7);
  const doneMonth = tasks.filter((t) => t.status === "done" && (t.completedAt ?? t.updatedAt ?? "").startsWith(month));

  const bySector = SECTORS.map((s) => {
    const list = tasks.filter((t) => t.sector === s);
    return { sector: s, total: list.length, done: list.filter((t) => t.status === "done").length };
  }).filter((s) => s.total > 0);

  const name = (id?: string | null) => allUsers.find((u) => u.id === id);
  const firstName = currentUser.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-7">
      <PageHeader
        title="Visão geral"
        description={`${greeting}, ${firstName}. Aqui está o resumo da operação: tarefas, financeiro e marketing em um só lugar.`}
        action={
          <button onClick={() => openNewTask()} className="btn-primary h-11 px-4 text-[15px] sm:h-[50px] sm:px-6 sm:text-[16px]">
            <Plus size={20} strokeWidth={2.25} /> Nova tarefa
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi icon={<ListTodo size={18} />} label="Tarefas abertas" value={num(open.length)} sub={`${mine.length} com você`} to="/tarefas" />
        <Kpi icon={<AlertTriangle size={18} />} label="Atrasadas" value={num(overdue.length)} sub="prazo vencido" tone={overdue.length ? "danger" : undefined} to="/tarefas" />
        <Kpi icon={<Wallet size={18} />} label="Faturamento (mês)" value={brl(extra?.finance?.faturamento ?? 0, { compact: true })} sub={`Lucro ${brl(extra?.finance?.lucroLiquido ?? 0, { compact: true })}`} to="/financeiro" />
        <Kpi icon={<Megaphone size={18} />} label="Leads (mês)" value={num(extra?.marketing?.leads ?? 0)} sub={`${extra?.marketing?.vendas ?? 0} vendas`} to="/marketing" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Minhas próximas tarefas */}
        <Card className="p-0">
          <div className="flex items-center justify-between p-5 pb-3">
            <SectionLabel index="01">Minhas próximas tarefas</SectionLabel>
            <Link to="/tarefas" className="flex items-center gap-1 text-xs text-accent hover:underline">
              Ver quadro <ArrowRight size={13} />
            </Link>
          </div>
          <ul>
            {mine.slice(0, 7).map((t) => {
              const tone = dueTone(t.dueDate);
              return (
                <li key={t.id}>
                  <button onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 border-t border-white/[0.05] px-5 py-3.5 text-left hover:bg-white/[0.025]">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", t.status === "doing" ? "bg-[#FF8A1F]" : "bg-accent")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-white">{t.title}</span>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{t.sector}</span>
                    </span>
                    <PriorityBadge priority={t.priority} />
                    <span className={cn("flex w-20 items-center justify-end gap-1 text-[13px]", tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-muted")}>
                      <Clock size={14} /> {dueLabel(t.dueDate)}
                    </span>
                  </button>
                </li>
              );
            })}
            {mine.length === 0 && (
              <li className="flex flex-col items-center gap-2 border-t border-white/[0.05] px-5 py-12 text-center text-sm text-muted">
                <CheckCircle2 size={24} className="text-success" />
                Nada pendente com você. Bom trabalho!
              </li>
            )}
          </ul>
        </Card>

        {/* Atividade recente */}
        <Card className="p-0">
          <div className="p-5 pb-3">
            <SectionLabel index="02">Atividade recente</SectionLabel>
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {(extra?.activity ?? []).map((a) => {
              const actor = name(a.actorId);
              return (
                <li key={a.id}>
                  <button onClick={() => openTask(a.taskId)} className="flex w-full items-start gap-3 border-t border-white/[0.05] px-5 py-3 text-left hover:bg-white/[0.025]">
                    <Avatar initials={actor?.initials ?? "?"} size={30} className="text-[10px]" />
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-[#C9C9CF]">
                      <span className="font-semibold text-white">{actor?.name.split(" ")[0] ?? "Alguém"}</span> {a.action} em{" "}
                      <span className="text-white">“{a.taskTitle}”</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">{relativeTime(a.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {extra && extra.activity.length === 0 && (
              <li className="border-t border-white/[0.05] px-5 py-12 text-center text-sm text-muted">Sem atividade ainda.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionLabel index="03">Andamento por setor</SectionLabel>
          <div className="mt-4 space-y-4">
            {bySector.map((s) => {
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              return (
                <Link key={s.sector} to={`/tarefas?setor=${s.sector}`} className="block">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-[#D4D4D8]">{s.sector}</span>
                    <span className="font-mono text-xs text-muted">{s.done}/{s.total} · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#FF7A2E] to-accent" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
            {bySector.length === 0 && <p className="text-sm text-muted">Nenhuma tarefa cadastrada ainda.</p>}
            {doneMonth.length > 0 && (
              <p className="pt-1 text-xs text-muted">{doneMonth.length} tarefa(s) concluída(s) este mês.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <SectionLabel index="04">Receita × despesa (6 meses)</SectionLabel>
            <Link to="/financeiro" className="text-xs text-accent hover:underline">Financeiro</Link>
          </div>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={extra?.series ?? []} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="vgRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5C00" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF5C00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#5E5E66" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#141416", border: "1px solid #27272B", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => brl(v, { compact: true })}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#FF5C00" strokeWidth={2} fill="url(#vgRec)" />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#3B82F6" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "danger";
  to: string;
}) {
  return (
    <Link to={to} className="card group block p-4 transition-colors hover:border-white/20 lg:p-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05]", tone === "danger" ? "text-danger" : "text-accent")}>{icon}</span>
        {label}
      </div>
      <div className={cn("mono-num mt-3 text-[28px] font-semibold leading-none tracking-tight", tone === "danger" ? "text-danger" : "text-white")}>{value}</div>
      <div className="mt-1.5 text-[12.5px] text-muted">{sub}</div>
    </Link>
  );
}
