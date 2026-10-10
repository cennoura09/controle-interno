import {
  createContext,
  useCallback,
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
// A lista de usuários é mantida em estado para que contas criadas via
// "Gerenciar equipe" apareçam em todo o app durante a sessão.
// TODO(backend): trocar por sessão real (auth) + API de usuários.
// ----------------------------------------------------------------------------

interface SessionValue {
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  users: User[];
  addUser: (user: User) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(USERS);
  // Começa como o Founder para mostrar o painel completo.
  const [currentUserId, setCurrentUserId] = useState<string>("u-founder");

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [...prev, user]);
  }, []);

  const value = useMemo<SessionValue>(() => {
    const currentUser =
      users.find((u) => u.id === currentUserId) ?? users[0];
    return { currentUser, setCurrentUserId, users, addUser };
  }, [users, currentUserId, addUser]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return ctx;
}
