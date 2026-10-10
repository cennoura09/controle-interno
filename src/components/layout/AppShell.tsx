import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ListChecks, Wallet, Megaphone } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../../lib/cn";

const MOBILE_NAV = [
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Navegação mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 backdrop-blur-md lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                isActive ? "text-accent" : "text-muted"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
