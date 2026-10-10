import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../lib/types";
import { USERS } from "../data/users";

// ----------------------------------------------------------------------------
// Sessão atual. No MVP usamos um "Role Switcher" para simular login de
// diferentes cargos e demonstrar as permissões ao vivo.
// TODO(backend): trocar por sessão real (auth) — o currentUser viria do login.
// ----------------------------------------------------------------------------

interface SessionValue {
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  users: User[];
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Começa como o Founder para mostrar o painel completo.
  const [currentUserId, setCurrentUserId] = useState<string>("u-founder");

  const value = useMemo<SessionValue>(() => {
    const currentUser =
      USERS.find((u) => u.id === currentUserId) ?? USERS[0];
    return { currentUser, setCurrentUserId, users: USERS };
  }, [currentUserId]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return ctx;
}
