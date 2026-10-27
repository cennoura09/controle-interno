import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { NewUser, User } from "../lib/types";
import { auth, data } from "../services";
import { FullScreenLoading, LoadError } from "../components/ui/Loading";
import { LoginPage } from "../pages/LoginPage";
import { SemAcesso } from "../pages/SemAcesso";

// ----------------------------------------------------------------------------
// Sessão atual.
// - Supabase (produção): o usuário vem do login real (Supabase Auth → ci_me).
//   Só o admin supremo pode "visualizar como" outro membro.
// - Mock/REST (dev/demo): sem login; o "Simular cargo" escolhe o usuário.
// ----------------------------------------------------------------------------

interface SessionValue {
  /** Usuário cujas permissões a UI reflete (pode ser simulado pelo admin). */
  currentUser: User;
  /** Usuário realmente autenticado. */
  authUser: User;
  setCurrentUserId: (id: string) => void;
  /** Pode trocar o usuário visualizado? (admin supremo ou modo demo) */
  canSwitchUser: boolean;
  /** Há login real (Supabase)? */
  hasAuth: boolean;
  /** Membros ativos (para atribuir tarefas etc.). */
  users: User[];
  /** Todos os membros, inclusive desativados (histórico e gestão da equipe). */
  allUsers: User[];
  /** Cria uma conta via serviço e devolve o usuário persistido. */
  createUser: (input: NewUser) => Promise<User>;
  /** Substitui um membro na lista local após uma escrita. */
  replaceUser: (user: User) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // undefined = ainda verificando a sessão do Supabase.
  const [session, setSession] = useState<Session | null | undefined>(
    auth ? undefined : null
  );

  useEffect(() => {
    if (!auth) return;
    auth.client.auth.getSession().then(({ data: s }) => setSession(s.session));
    const { data: sub } = auth.client.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!auth) return <TeamSession userKey="demo">{children}</TeamSession>;
  if (session === undefined) return <FullScreenLoading label="Verificando sessão…" />;
  if (!session) return <LoginPage />;
  return <TeamSession userKey={session.user.id}>{children}</TeamSession>;
}

function TeamSession({ userKey, children }: { userKey: string; children: ReactNode }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [denied, setDenied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setDenied(false);
    const mePromise = auth ? auth.me() : Promise.resolve(null);
    Promise.all([mePromise, data.listUsers()])
      .then(([meUser, list]) => {
        setMe(meUser);
        setUsers(list);
        setCurrentUserId(meUser?.id ?? "u-founder");
      })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e));
        if ((err as { status?: number }).status === 403) setDenied(true);
        else setError(err);
      });
  }, []);

  useEffect(load, [load, userKey]);

  const createUser = useCallback(async (input: NewUser) => {
    const user = await data.createUser(input);
    setUsers((prev) => [...(prev ?? []), user]);
    return user;
  }, []);

  const replaceUser = useCallback((user: User) => {
    setUsers((prev) => (prev ?? []).map((u) => (u.id === user.id ? user : u)));
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await auth.client.auth.signOut();
  }, []);

  const value = useMemo<SessionValue | null>(() => {
    if (!users || users.length === 0) return null;
    const authUser = me ?? users.find((u) => u.id === "u-founder") ?? users[0];
    const canSwitchUser = !auth || authUser.isSuperAdmin === true;
    const currentUser =
      (canSwitchUser && users.find((u) => u.id === currentUserId)) || authUser;
    return {
      currentUser,
      authUser,
      setCurrentUserId: (id) => canSwitchUser && setCurrentUserId(id),
      canSwitchUser,
      hasAuth: auth !== null,
      users: users.filter((u) => u.active !== false),
      allUsers: users,
      createUser,
      replaceUser,
      signOut,
    };
  }, [users, me, currentUserId, createUser, replaceUser, signOut]);

  if (denied) return <SemAcesso onSignOut={signOut} />;

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

