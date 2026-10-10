import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, UserCog } from "lucide-react";
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
 * Seletor de "quem sou eu" — simula login de diferentes cargos para
 * demonstrar as permissões ao vivo. (No produto real, viria da autenticação.)
 */
export function RoleSwitcher() {
  const { currentUser, setCurrentUserId, users } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="focus-ring flex items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left transition-colors hover:border-muted-2"
      >
        <Avatar initials={currentUser.initials} size={30} />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-medium">{currentUser.name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            {currentUser.role} · {currentUser.sector}
          </span>
        </span>
        <ChevronDown size={15} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <UserCog size={15} className="text-accent" />
            <div>
              <div className="text-sm font-medium">Simular cargo</div>
              <div className="text-[11px] text-muted">
                Troque o usuário para testar as permissões
              </div>
            </div>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
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
        </div>
      )}
    </div>
  );
}
