import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, UserCog, LogOut, Crown } from "lucide-react";
import { useSession } from "../../context/SessionContext";
import { assignmentScopeLabel } from "../../lib/permissions";
import { Avatar, Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";
import type { Role } from "../../lib/types";

const ROLE_TONE: Record<Role, "accent" | "info" | "success" | "neutral"> = {
  Founder: "accent",
  CEO: "accent",
  CMO: "info",
  CCO: "info",
  CFO: "info",
  COO: "info",
  Colaborador: "neutral",
};

/**
 * Menu do usuário. Com login real mostra a conta e "Sair"; o admin supremo
 * (e o modo demo) também pode "visualizar como" outro membro para conferir
 * as permissões de cada cargo.
 */
export function RoleSwitcher() {
  const { currentUser, authUser, setCurrentUserId, users, canSwitchUser, hasAuth, signOut } =
    useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const viewingAs = currentUser.id !== authUser.id && hasAuth;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-ring flex items-center gap-2.5 rounded-lg border bg-surface px-2.5 py-1.5 text-left transition-colors hover:border-muted-2",
          viewingAs ? "border-accent/60" : "border-border"
        )}
      >
        <Avatar initials={currentUser.initials} size={30} />
        <span className="hidden leading-tight sm:block">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {currentUser.name}
            {currentUser.isSuperAdmin && <Crown size={12} className="text-accent" />}
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            {viewingAs ? "visualizando como · " : ""}
            {currentUser.role} · {currentUser.sector}
          </span>
        </span>
        <ChevronDown size={15} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {hasAuth && (
            <div className="border-b border-border px-4 py-3">
              <div className="mono-label mb-1">CONECTADO COMO</div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {authUser.name}
                {authUser.isSuperAdmin && <Badge tone="accent">Admin supremo</Badge>}
              </div>
              <div className="truncate text-[11px] text-muted">{authUser.email}</div>
            </div>
          )}

          {canSwitchUser && (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <UserCog size={15} className="text-accent" />
                <div>
                  <div className="text-sm font-medium">
                    {hasAuth ? "Visualizar como" : "Simular cargo"}
                  </div>
                  <div className="text-[11px] text-muted">
                    Troque o usuário para conferir as permissões
                  </div>
                </div>
              </div>
              <ul className="max-h-72 overflow-y-auto py-1">
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
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2",
                          active && "bg-surface-2"
                        )}
                      >
                        <Avatar initials={u.initials} size={30} />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm">{u.name}</span>
                            <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {u.title} · pode atribuir: {assignmentScopeLabel(u)}
                          </span>
                        </span>
                        {active && <Check size={15} className="shrink-0 text-accent" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {hasAuth && (
            <button
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-content"
            >
              <LogOut size={15} /> Sair
            </button>
          )}
        </div>
      )}
    </div>
  );
}
