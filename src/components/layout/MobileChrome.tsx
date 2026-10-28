import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, LayoutGrid, UsersRound, LogOut, X } from "lucide-react";
import { Brand } from "../ui/Logo";
import { useUI } from "../../context/UIContext";
import { useSession } from "../../context/SessionContext";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";
import { MOBILE_NAV, MORE_NAV } from "./nav";
import { cn } from "../../lib/cn";

/** Cabeçalho do celular: marca, busca, notificações e usuário. */
export function MobileHeader() {
  const { openPalette } = useUI();
  return (
    <header className="ambient-glow sticky top-0 z-30 flex h-[76px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-bg/90 px-4 backdrop-blur-md lg:hidden">
      <Brand size={46} />
      <div className="flex-1" />
      <button
        onClick={openPalette}
        className="focus-ring grid h-11 w-11 place-items-center rounded-xl text-[#C9C9CF] hover:bg-white/5"
        aria-label="Buscar"
      >
        <Search size={23} strokeWidth={1.75} />
      </button>
      <NotificationsMenu size={44} />
      <UserMenu compact />
    </header>
  );
}

/** Barra inferior do celular (Início, Tarefas, Financeiro, Marketing, Mais). */
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <nav className="pb-safe fixed inset-x-3 bottom-3 z-30 flex rounded-[26px] border border-white/[0.08] bg-[#111113]/95 px-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] backdrop-blur-md lg:hidden">
        {MOBILE_NAV.map(({ to, label, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-1 pb-3 pt-3 text-[11.5px]",
                isActive ? "text-accent" : "text-[#8E8E96]"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={23} strokeWidth={1.75} />
                {short ?? label}
                {isActive && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(255,92,0,0.9)]" />}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 pb-3 pt-3 text-[11.5px] text-[#8E8E96]"
        >
          <LayoutGrid size={23} strokeWidth={1.75} />
          Mais
        </button>
      </nav>
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { setTeamOpen } = useUI();
  const { hasAuth, signOut } = useSession();
  const item = "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-content hover:bg-white/[0.04]";
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-[#121214] p-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="mono-label">Mais opções</span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {MORE_NAV.map(({ to, label, icon: Icon }) => (
          <button
            key={to}
            className={item}
            onClick={() => {
              onClose();
              navigate(to);
            }}
          >
            <Icon size={20} className="text-accent" /> {label}
          </button>
        ))}
        <button
          className={item}
          onClick={() => {
            onClose();
            setTeamOpen(true);
          }}
        >
          <UsersRound size={20} className="text-accent" /> Equipe
        </button>
        {hasAuth && (
          <button className={cn(item, "text-muted")} onClick={() => void signOut()}>
            <LogOut size={20} /> Sair
          </button>
        )}
      </div>
    </div>
  );
}
