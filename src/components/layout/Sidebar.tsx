import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { Brand, LogoMark } from "../ui/Logo";
import { Avatar } from "../ui/Badge";
import { useSession } from "../../context/SessionContext";
import { useTasks } from "../../context/TasksContext";
import { useUI } from "../../context/UIContext";
import { isOnline, monthYearLabel } from "../../lib/dates";
import { NAV } from "./nav";

/** Tarefas que contam para o usuário: as dele e as do setor dele. */
export function useMyScopeTasks() {
  const { currentUser } = useSession();
  const { tasks } = useTasks();
  return tasks.filter((t) => t.assigneeId === currentUser.id || t.sector === currentUser.sector);
}

/** "TAREFAS · SETOR — x%": progresso das tarefas do seu escopo no mês. */
export function ProgressWidget({ className }: { className?: string }) {
  const { currentUser } = useSession();
  const scope = useMyScopeTasks();
  const done = scope.filter((t) => t.status === "done").length;
  const pct = scope.length ? Math.round((done / scope.length) * 100) : 0;
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="mono-label text-[11px] text-[#B5B5BC]">Tarefas · {currentUser.sector}</span>
        <span className="font-mono text-[13px] font-semibold text-accent">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF7A2E] to-accent shadow-[0_0_10px_rgba(255,92,0,0.6)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[12.5px] text-muted">
        <span>{done} / {scope.length} concluídas</span>
        <span>{monthYearLabel()}</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { users } = useSession();
  const { sidebarCollapsed: collapsed, toggleSidebar, setTeamOpen } = useUI();
  const scope = useMyScopeTasks();
  const open = scope.filter((t) => t.status !== "done").length;
  const online = users.filter((u) => isOnline(u.lastSeenAt));
  const avatars = [...users].sort((a, b) => Number(isOnline(b.lastSeenAt)) - Number(isOnline(a.lastSeenAt))).slice(0, 3);

  return (
    <aside
      className={cn(
        "ambient-glow relative hidden shrink-0 flex-col border-r border-white/[0.06] bg-[#0B0B0D] transition-[width] duration-200 lg:flex",
        collapsed ? "w-[92px]" : "w-[288px]"
      )}
    >
      {/* Marca */}
      <div className={cn("flex items-center px-6 pb-6 pt-6", collapsed ? "justify-center px-0" : "justify-between")}>
        {collapsed ? <LogoMark size={52} /> : <Brand size={60} />}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-content"
            aria-label="Recolher menu"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={toggleSidebar}
          className="focus-ring mx-auto mb-4 rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-content"
          aria-label="Expandir menu"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navegação */}
      <nav className={cn("px-3", collapsed && "px-4")}>
        <ul className="space-y-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-[52px] items-center gap-4 rounded-xl border px-4 text-[16px] transition-all",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "border-accent/45 bg-gradient-to-r from-accent/25 via-accent/10 to-accent/[0.04] text-white shadow-[inset_0_0_24px_-12px_rgba(255,92,0,0.6)]"
                      : "border-transparent text-[#C9C9CF] hover:bg-white/[0.04] hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={1.75} className={cn("shrink-0", isActive ? "text-accent" : "text-[#A1A1A8]")} />
                    {!collapsed && <span className="flex-1 font-medium">{label}</span>}
                    {to === "/tarefas" && open > 0 && (
                      <span
                        className={cn(
                          "grid h-6 min-w-[26px] place-items-center rounded-md px-1.5 font-mono text-[12px] font-semibold",
                          isActive ? "bg-accent/25 text-[#FFB27A]" : "bg-white/[0.06] text-muted",
                          collapsed && "absolute -right-1 -top-1 h-5 min-w-[20px] text-[10px]"
                        )}
                      >
                        {open}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -right-[13px] top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px_2px_rgba(255,92,0,0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Equipe */}
      <div className={cn("mt-8 px-6", collapsed && "px-0 text-center")}>
        {!collapsed && <div className="mono-label mb-3 text-[12px] text-[#9A9AA2]">Equipe</div>}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-0")}>
          <div className={cn("flex", collapsed ? "flex-col items-center gap-2" : "-space-x-2")}>
            {avatars.map((u) => (
              <Avatar
                key={u.id}
                initials={u.initials}
                size={40}
                title={u.name}
                online={isOnline(u.lastSeenAt)}
                className="ring-2 ring-[#0B0B0D]"
              />
            ))}
          </div>
          <button
            onClick={() => setTeamOpen(true)}
            className={cn(
              "focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition-colors hover:border-accent/50 hover:text-accent",
              !collapsed && "ml-3"
            )}
            aria-label="Gerenciar equipe"
            title="Gerenciar equipe"
          >
            <Plus size={18} />
          </button>
        </div>
        {!collapsed && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {online.length} {online.length === 1 ? "membro online" : "membros online"}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Progresso de tarefas */}
      {!collapsed && <ProgressWidget className="mx-5 mb-5" />}
      <div className={cn("flex items-center gap-2 px-7 pb-6 font-mono text-[12px] text-muted", collapsed && "justify-center px-0")}>
        <span className="h-2 w-2 rounded-full bg-success" />
        {!collapsed && "v1.0.0 · produção"}
      </div>
    </aside>
  );
}
