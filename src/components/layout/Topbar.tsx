import { Search } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Barra superior (desktop): busca global, notificações e usuário. */
export function Topbar() {
  const { openPalette } = useUI();
  return (
    <header className="sticky top-0 z-30 hidden h-[88px] shrink-0 items-center gap-6 border-b border-white/[0.06] bg-bg/80 px-10 backdrop-blur-md lg:flex">
      <button
        onClick={openPalette}
        className="focus-ring flex h-[50px] w-full max-w-[500px] items-center gap-3.5 rounded-xl border border-white/[0.09] bg-white/[0.02] px-4 text-left text-[15px] text-[#8E8E96] transition-colors hover:border-white/20"
      >
        <Search size={21} strokeWidth={1.75} className="text-[#C9C9CF]" />
        <span className="flex-1">Buscar tarefas, pessoas, setores...</span>
        <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[12px] text-[#C9C9CF]">
          {isMac ? "⌘ K" : "Ctrl K"}
        </kbd>
      </button>
      <div className="flex-1" />
      <NotificationsMenu />
      <UserMenu />
    </header>
  );
}
