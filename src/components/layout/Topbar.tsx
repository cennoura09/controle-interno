import { Bell, Search } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          className="focus-ring hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:border-muted-2 md:flex"
          aria-label="Buscar"
        >
          <Search size={14} />
          <span>Buscar…</span>
          <kbd className="ml-2 rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <button
          className="focus-ring relative rounded-lg border border-border bg-surface p-2 text-muted hover:text-content"
          aria-label="Notificações"
        >
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <RoleSwitcher />
      </div>
    </header>
  );
}
