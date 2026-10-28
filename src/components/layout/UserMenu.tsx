import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Check, UserCog, LogOut, Crown, Settings, UsersRound } from "lucide-react";
import { useSession } from "../../context/SessionContext";
import { useUI } from "../../context/UIContext";
import { assignmentScopeLabel } from "../../lib/permissions";
import { Avatar, Badge } from "../ui/Badge";
import { Popover, useDismiss } from "../ui/Menu";
import { cn } from "../../lib/cn";

/**
 * Menu do usuário (topo direito). Mostra a conta, atalhos e "Sair"; o admin
 * supremo (e o modo demo) também pode "visualizar como" outro membro.
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { currentUser, authUser, setCurrentUserId, users, canSwitchUser, hasAuth, signOut } =
    useSession();
  const { setTeamOpen } = useUI();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const viewingAs = currentUser.id !== authUser.id && hasAuth;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-ring flex items-center gap-3.5 rounded-xl text-left transition-colors hover:bg-white/[0.03]",
          compact ? "p-0" : "py-1 pl-1 pr-2",
          viewingAs && "ring-1 ring-accent/60"
        )}
        aria-label="Menu do usuário"
      >
        <Avatar initials={currentUser.initials} size={compact ? 44 : 50} className="text-[15px]" />
        {!compact && (
          <span className="hidden leading-tight md:block">
            <span className="flex items-center gap-2 text-[17px] font-semibold text-white">
              {currentUser.name}
              {currentUser.isSuperAdmin && <Crown size={16} className="text-accent" />}
            </span>
            <span className="mt-1 block font-mono text-[11.5px] uppercase tracking-[0.12em] text-muted">
              {viewingAs ? "visualizando · " : ""}
              {currentUser.role} · {currentUser.sector}
            </span>
          </span>
        )}
        {!compact && <ChevronDown size={20} className="ml-2 hidden text-[#C9C9CF] md:block" />}
      </button>

      {open && (
        <Popover width={320} sheetOnMobile>
          <div className="border-b border-border px-4 py-3">
            <div className="mono-label mb-1">Conectado como</div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {authUser.name}
              {authUser.isSuperAdmin && <Badge tone="accent">Admin supremo</Badge>}
            </div>
            {authUser.email && <div className="truncate text-[11px] text-muted">{authUser.email}</div>}
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/configuracoes");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-2"
            >
              <Settings size={15} className="text-muted" /> Configurações
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTeamOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-2"
            >
              <UsersRound size={15} className="text-muted" /> Equipe
            </button>
          </div>

          {canSwitchUser && (
            <div className="border-t border-border">
              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <UserCog size={14} className="text-accent" />
                <span className="text-xs font-medium">{hasAuth ? "Visualizar como" : "Simular cargo"}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto py-1">
                {users.map((u) => {
                  const active = u.id === currentUser.id;
                  return (
                    <li key={u.id}>
                      <button
                        onClick={() => {
                          setCurrentUserId(u.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2",
                          active && "bg-surface-2"
                        )}
                      >
                        <Avatar initials={u.initials} size={28} />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-sm">{u.name}</span>
                          <span className="block truncate text-[11px] text-muted">
                            {u.role} · {assignmentScopeLabel(u)}
                          </span>
                        </span>
                        {active && <Check size={15} className="shrink-0 text-accent" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {hasAuth && (
            <button
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-content"
            >
              <LogOut size={15} /> Sair
            </button>
          )}
        </Popover>
      )}
    </div>
  );
}
