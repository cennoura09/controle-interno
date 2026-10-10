import { NavLink } from "react-router-dom";
import { ListChecks, Wallet, Megaphone, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { ProgressBar } from "../ui/ProgressBar";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

const NAV: NavItem[] = [
  { to: "/tarefas", label: "Tarefas", icon: ListChecks, hint: "Kanban por setor e responsável" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, hint: "Receitas, despesas e faturamento" },
  { to: "/marketing", label: "Marketing", icon: Megaphone, hint: "Leads, canais e ROAS" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg lg:flex">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-mono text-lg font-bold text-black">
          C
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Controle Interno</div>
          <div className="mono-label text-accent">OPERAÇÃO</div>
        </div>
      </div>

      {/* Empresa */}
      <div className="mx-3 mb-2 rounded-lg border border-border bg-surface px-3 py-2.5">
        <div className="mono-label mb-0.5">EMPRESA</div>
        <div className="text-sm font-medium">Acme Growth Co.</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Ativa · 13 membros
        </div>
      </div>

      {/* Navegação */}
      <nav className="mt-3 flex-1 px-3">
        <div className="mono-label px-2 pb-2">OPERAÇÃO & TELEMETRIA</div>
        <ul className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, hint }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent-soft text-content"
                      : "text-muted hover:bg-surface hover:text-content"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                    )}
                    <Icon
                      size={18}
                      className={cn("mt-0.5 shrink-0", isActive && "text-accent")}
                    />
                    <span className="leading-tight">
                      <span className="block font-medium">{label}</span>
                      <span className="block text-[11px] text-muted-2">{hint}</span>
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Widget inferior */}
      <div className="m-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="mono-label">TAREFAS DA SEMANA</span>
          <span className="font-mono text-xs text-accent">69%</span>
        </div>
        <ProgressBar value={69} className="mt-2" />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span className="font-mono">9 / 13 concluídas</span>
          <span>Out 2026</span>
        </div>
      </div>
      <div className="px-5 pb-4 font-mono text-[10px] text-muted-2">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
        v0.1.0 — mvp
      </div>
    </aside>
  );
}
