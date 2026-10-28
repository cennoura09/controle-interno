import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import type { NewTask, Task, TaskPatch, TaskStatus } from "../lib/types";
import { data } from "../services";

// ----------------------------------------------------------------------------
// Estado das tarefas compartilhado pelo app inteiro: quadro, lista,
// calendário, sidebar (contador/progresso), visão geral e busca. As escritas
// são otimistas e, se o servidor recusar, a lista é recarregada.
// O painel de detalhe abre por `?tarefa=<id>` em qualquer rota.
// ----------------------------------------------------------------------------

interface TasksValue {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
  create: (inputs: NewTask[]) => Promise<Task[]>;
  move: (id: string, status: TaskStatus) => Promise<void>;
  update: (id: string, patch: TaskPatch) => Promise<Task | null>;
  remove: (id: string) => Promise<void>;
  /** Substitui a tarefa na lista local (ex.: após editar no painel). */
  replace: (task: Task) => void;
  /** Último erro de escrita (mostrado como aviso). */
  actionError: string | null;
  clearActionError: () => void;
  openTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
}

const TasksContext = createContext<TasksValue | null>(null);

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const reload = useCallback(() => {
    setLoading(true);
    data
      .listTasks()
      .then((list) => {
        setTasks(list);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const replace = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }, []);

  const create = useCallback(async (inputs: NewTask[]) => {
    const created = await data.createTasks(inputs);
    setTasks((prev) => [...created, ...prev]);
    return created;
  }, []);

  const move = useCallback(
    async (id: string, status: TaskStatus) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      try {
        setActionError(null);
        replace(await data.updateTaskStatus(id, status));
      } catch (e) {
        setActionError(message(e));
        reload();
      }
    },
    [reload, replace]
  );

  const update = useCallback(
    async (id: string, patch: TaskPatch) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, ...patch, dueDate: patch.dueDate === null ? undefined : patch.dueDate ?? t.dueDate } : t
        )
      );
      try {
        setActionError(null);
        const saved = await data.updateTask(id, patch);
        replace(saved);
        return saved;
      } catch (e) {
        setActionError(message(e));
        reload();
        return null;
      }
    },
    [reload, replace]
  );

  const remove = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        setActionError(null);
        await data.deleteTask(id);
      } catch (e) {
        setActionError(message(e));
        reload();
      }
    },
    [reload]
  );

  const openTaskId = params.get("tarefa");
  const openTask = useCallback(
    (id: string) =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.set("tarefa", id);
        return next;
      }),
    [setParams]
  );
  const closeTask = useCallback(
    () =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("tarefa");
        return next;
      }),
    [setParams]
  );

  const value = useMemo<TasksValue>(
    () => ({
      tasks,
      loading,
      error,
      reload,
      create,
      move,
      update,
      remove,
      replace,
      actionError,
      clearActionError: () => setActionError(null),
      openTaskId,
      openTask,
      closeTask,
    }),
    [tasks, loading, error, reload, create, move, update, remove, replace, actionError, openTaskId, openTask, closeTask]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks deve ser usado dentro de TasksProvider");
  return ctx;
}
