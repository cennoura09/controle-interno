import { useState } from "react";
import { Plus, Copy, CircleCheck, Inbox } from "lucide-react";
import type { Task, TaskStatus } from "../../lib/types";
import { STATUS_META, STATUS_ORDER } from "../../lib/labels";
import { useTasks } from "../../context/TasksContext";
import { useSession } from "../../context/SessionContext";
import { useUI } from "../../context/UIContext";
import { TaskCard } from "./TaskCard";
import { cn } from "../../lib/cn";

const EMPTY_ICON: Record<TaskStatus, typeof Inbox> = { todo: Inbox, doing: Copy, done: CircleCheck };

const COLUMN_GLOW: Record<TaskStatus, string> = {
  todo: "shadow-[inset_2px_0_0_rgba(255,92,0,0.9),-8px_0_30px_-14px_rgba(255,92,0,0.9)]",
  doing: "shadow-[inset_2px_0_0_rgba(255,138,31,0.75),-8px_0_30px_-16px_rgba(255,138,31,0.8)]",
  done: "shadow-[inset_2px_0_0_rgba(52,211,153,0.7),-8px_0_30px_-16px_rgba(52,211,153,0.7)]",
};

/** Quadro em 3 colunas. No celular as colunas rolam na horizontal. */
export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const { move } = useTasks();
  const { openNewTask } = useUI();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  function drop(status: TaskStatus) {
    const task = tasks.find((t) => t.id === dragId);
    if (task && task.status !== status) void move(task.id, status);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0">
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status];
        const col = tasks.filter((t) => t.status === status);
        const EmptyIcon = EMPTY_ICON[status];
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status);
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => drop(status)}
            className={cn(
              "panel flex w-[84vw] max-w-[360px] shrink-0 snap-start flex-col p-3 transition-colors sm:w-[46vw] lg:w-auto lg:max-w-none lg:p-4",
              col.length > 0 && COLUMN_GLOW[status],
              overCol === status && "border-accent/60 bg-accent/[0.06]"
            )}
          >
            <header className="flex h-10 items-center justify-between px-1.5 lg:h-12">
              <div className="flex items-center gap-2.5 font-mono text-[14px] font-semibold uppercase tracking-[0.12em] lg:text-[15px]">
                <span className={cn("h-3 w-3 rounded-full", meta.dot, "shadow-[0_0_10px_currentColor]", meta.text)} />
                <span className={meta.text}>{meta.index}</span>
                <span className="text-[#6E6E76]">//</span>
                <span className="text-white">{meta.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-medium tabular-nums text-[#D4D4D8]">{col.length}</span>
                <button
                  onClick={() => openNewTask(status)}
                  className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[#C9C9CF] hover:border-accent/50 hover:text-accent lg:hidden"
                  aria-label={`Nova tarefa em ${meta.label}`}
                >
                  <Plus size={18} />
                </button>
              </div>
            </header>

            <div className="mt-3 flex min-h-[160px] flex-1 flex-col gap-3">
              {status === "todo" && <QuickAdd status={status} />}
              {col.map((t) => (
                <TaskCard key={t.id} task={t} onDragStart={setDragId} onDragEnd={() => setOverCol(null)} />
              ))}
              {col.length === 0 && status !== "todo" && (
                <div className="flex min-h-[300px] flex-1 flex-col items-center justify-start rounded-xl border border-white/[0.06] bg-white/[0.015] px-6 pt-20 text-center lg:min-h-[520px] lg:pt-[118px]">
                  <EmptyIcon size={34} strokeWidth={1.5} className="text-[#8E8E96]" />
                  <div className="mt-4 text-[16px] font-semibold text-white">{meta.empty}</div>
                  <div className="mt-1.5 max-w-[220px] text-[14px] leading-snug text-[#8E8E96]">{meta.emptySub}</div>
                </div>
              )}
              {col.length === 0 && status === "todo" && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center text-sm text-muted">
                  Nenhuma tarefa a fazer neste filtro.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** "+ Adicionar tarefa": cria na hora para você, no seu setor. */
function QuickAdd({ status }: { status: TaskStatus }) {
  const { currentUser } = useSession();
  const { create } = useTasks();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    setTitle("");
    try {
      await create([
        {
          title: value,
          priority: "media",
          sector: currentUser.sector,
          assigneeId: currentUser.id,
          createdById: currentUser.id,
          status,
        },
      ]);
    } catch {
      setTitle(value);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="focus-ring hidden h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-left text-[15px] text-[#9A9AA2] transition-colors hover:border-white/20 hover:text-white lg:flex"
      >
        <Plus size={18} /> Adicionar tarefa
      </button>
    );
  }

  return (
    <div className="hidden rounded-xl border border-accent/50 bg-white/[0.03] p-2 lg:block">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") {
            setEditing(false);
            setTitle("");
          }
        }}
        onBlur={() => !title.trim() && setEditing(false)}
        placeholder="Título da tarefa e Enter…"
        className="h-9 w-full bg-transparent px-2 text-[15px] text-white outline-none placeholder:text-muted-2"
        disabled={busy}
      />
      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-muted">
        <span>Para você · {currentUser.sector} · Média</span>
        <span>Enter para criar · Esc cancela</span>
      </div>
    </div>
  );
}
