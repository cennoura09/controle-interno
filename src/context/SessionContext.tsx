import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NewUser, User } from "../lib/types";
import { data } from "../services";
import { FullScreenLoading, LoadError } from "../components/ui/Loading";

// ----------------------------------------------------------------------------
// Sessão atual. No MVP usamos um "Role Switcher" para simular login de
// diferentes cargos e demonstrar as permissões ao vivo.
// Os usuários vêm da camada de serviços (src/services) — mock em dev, API em
// produção. Contas criadas via "Gerenciar equipe" entram pela mesma camada.
// TODO(backend): derivar o currentUser da sessão real (auth), não do switcher.
// ----------------------------------------------------------------------------

interface SessionValue {
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  users: User[];
  /** Cria uma conta via serviço e devolve o usuário persistido. */
  createUser: (input: NewUser) => Promise<User>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("u-founder");

  const load = useCallback(() => {
    setError(null);
    data
      .listUsers()
      .then(setUsers)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e : new Error(String(e)))
      );
  }, []);

  useEffect(load, [load]);

  const createUser = useCallback(async (input: NewUser) => {
    const user = await data.createUser(input);
    setUsers((prev) => [...(prev ?? []), user]);
    return user;
  }, []);

  const value = useMemo<SessionValue | null>(() => {
    if (!users || users.length === 0) return null;
    const currentUser = users.find((u) => u.id === currentUserId) ?? users[0];
    return { currentUser, setCurrentUserId, users, createUser };
  }, [users, currentUserId, createUser]);

  if (error) {
    return (
      <div className="h-full">
        <LoadError error={error} onRetry={load} />
      </div>
    );
  }

  if (!value) {
    return <FullScreenLoading label="Carregando equipe…" />;
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return ctx;
}
