import { useMemo, useState } from "react";
import { Plus, Inbox } from "lucide-react";
import { SectionHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Loading, LoadError } from "../components/ui/Loading";
import { TaskCard } from "../components/tarefas/TaskCard";
import { NovaTarefaModal } from "../components/tarefas/NovaTarefaModal";
import { useSession } from "../context/SessionContext";
import { isGlobalRole } from "../lib/permissions";
import { data } from "../services";
import { useAsync } from "../lib/useAsync";
import type { Task, TaskStatus } from "../lib/types";
import { cn } from "../lib/cn";

type Scope = "minhas" | "setor" | "todas";

const COLUMNS: { status: TaskStatus; label: string; index: string; accent: string }[] = [
  { status: "todo", label: "A Fazer", index: "01", accent: "bg-muted-2" },
  { status: "doing", label: "Em Andamento", index: "02", accent: "bg-accent" },
  { status: "done", label: "Concluída", index: "03", accent: "bg-success" },
];

export function TarefasPage() {
  const { currentUser } = useSession();
  const { data: loaded, loading, error, setData: setTasks, reload } = useAsync(
    () => data.listTasks(),
    []
  );
  const tasks = useMemo(() => loaded ?? [], [loaded]);
  const [scope, setScope] = useState<Scope>("setor");
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canSeeAll = isGlobalRole(currentUser.role);

  const scopes: { value: Scope; label: string }[] = [
    { value: "minhas", label: "Minhas" },
    { value: "setor", label: `Setor ${currentUser.sector}` },
    ...(canSeeAll ? [{ value: "todas" as Scope, label: "Todas" }] : []),
  ];

  const effectiveScope: Scope = scope === "todas" && !canSeeAll ? "setor" : scope;

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (effectiveScope === "minhas") return t.assigneeId === currentUser.id;
      if (effectiveScope === "setor") return t.sector === currentUser.sector;
      return true; // todas
    });
  }, [tasks, effectiveScope, currentUser]);

  async function moveTask(id: string, status: TaskStatus) {
    // Otimista: move na UI e persiste; se falhar, recarrega do serviço.
    setTasks((prev) =>
      (prev ?? []).map((t) => (t.id === id ? { ...t, status } : t))
    );
    try {
      setActionError(null);
      await data.updateTaskStatus(id, status);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      reload();
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    setTasks((prev) => (prev ?? []).filter((t) => t.id !== task.id));
    try {
      setActionError(null);
      await data.deleteTask(task.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      reload();
    }
  }

  function handleDrop(status: TaskStatus) {
    if (dragId) void moveTask(dragId, status);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tarefas"
        description="Acompanhamento do andamento por setor e responsável. Cada pessoa vê o que é seu e o do seu setor; diretores e C-level distribuem conforme a permissão."
        right={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Nova tarefa
          </Button>
        }
      />

      {/* Filtros de escopo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="mono-label">VISUALIZAR</div>
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {scopes.map((s) => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                effectiveScope === s.value
                  ? "bg-accent text-black"
                  : "text-muted hover:text-content"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-2">
          {visible.length} tarefa{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {actionError}
        </div>
      )}

      {error ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && tasks.length === 0 ? (
        <Loading label="Carregando tarefas…" />
      ) : (
      <>
      {/* Kanban */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = visible.filter((t) => t.status === col.status);
          return (
            <section
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
              onDrop={() => handleDrop(col.status)}
              className={cn(
                "flex flex-col gap-3 rounded-card border bg-surface/40 p-3 transition-colors",
                overCol === col.status ? "border-accent/60 bg-accent-soft/30" : "border-border"
              )}
            >
              <div className="flex items-center justify-between px-1">
                <div className="mono-label flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                  <span className="text-accent">{col.index}</span>
                  <span className="text-muted-2">//</span>
                  <span>{col.label}</span>
                </div>
                <span className="font-mono text-xs text-muted">{colTasks.length}</span>
              </div>

              <div className="flex min-h-[120px] flex-col gap-3">
                {colTasks.length === 0 ? (
                  <EmptyState title="Sem tarefas aqui" />
                ) : (
                  colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onDragStart={setDragId}
                      onDelete={deleteTask}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {visible.length === 0 && (
        <EmptyState
          icon={<Inbox size={24} />}
          title="Nenhuma tarefa neste escopo"
          description="Crie uma nova tarefa ou troque o filtro de visualização."
        />
      )}
      </>
      )}

      <NovaTarefaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (inputs) => {
          const created = await data.createTasks(inputs);
          setTasks((prev) => [...created, ...(prev ?? [])]);
        }}
      />
    </div>
  );
}
