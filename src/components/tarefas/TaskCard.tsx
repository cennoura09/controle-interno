import { Clock, MoreVertical, MoreHorizontal, CheckSquare, MessageSquare, Paperclip, Check } from "lucide-react";
import type { Task } from "../../lib/types";
import { useSession } from "../../context/SessionContext";
import { useTasks } from "../../context/TasksContext";
import { canMoveTask } from "../../lib/permissions";
import { dueLabel, dueTone } from "../../lib/dates";
import { Avatar, PriorityBadge } from "../ui/Badge";
import { TaskMenu } from "./TaskMenu";
import { cn } from "../../lib/cn";

const ACCENT: Record<Task["status"], string> = {
  todo: "before:bg-accent before:shadow-[0_0_14px_2px_rgba(255,92,0,0.55)]",
  doing: "before:bg-[#FF8A1F] before:shadow-[0_0_14px_2px_rgba(255,138,31,0.5)]",
  done: "before:bg-success before:shadow-[0_0_14px_2px_rgba(52,211,153,0.45)]",
};

export function TaskCard({
  task,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  const { currentUser, allUsers } = useSession();
  const { openTask } = useTasks();
  const assignee = allUsers.find((u) => u.id === task.assigneeId);
  const movable = canMoveTask(currentUser, task);
  const done = task.status === "done";
  const tone = dueTone(task.dueDate, done);
  const firstLine = task.description?.split("\n").find((l) => l.trim() && !/^\s*[-•*]/.test(l));

  return (
    <article
      draggable={movable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(task.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => openTask(task.id)}
      className={cn(
        "group relative cursor-pointer rounded-xl border border-white/[0.08] bg-[#141416] p-4 transition-all hover:border-white/[0.16] hover:bg-[#17171A]",
        // Filete colorido à esquerda (visual do celular; sutil no desktop).
        "before:absolute before:inset-y-3 before:left-0 before:w-[2px] before:rounded-full lg:before:opacity-0 lg:hover:before:opacity-100",
        ACCENT[task.status],
        movable && "active:cursor-grabbing"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[#B5B5BC]">
          {done && <Check size={11} className="text-success" />}
          {task.sector}
        </span>
        <div className="flex items-center gap-1">
          <PriorityBadge priority={task.priority} />
          <TaskMenu
            task={task}
            trigger={(toggle) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                className="focus-ring -mr-1.5 rounded-md p-1 text-[#8E8E96] hover:bg-white/5 hover:text-white"
                aria-label={`Ações de ${task.title}`}
              >
                <MoreVertical size={17} />
              </button>
            )}
          />
        </div>
      </div>

      <h4
        className={cn(
          "mt-3 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-white",
          done && "text-[#8E8E96] line-through decoration-[#5E5E66]"
        )}
      >
        {task.title}
      </h4>
      {firstLine && <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-snug text-[#9A9AA2]">{firstLine}</p>}

      {(task.checklistTotal || task.commentCount || task.fileCount) ? (
        <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-muted">
          {!!task.checklistTotal && (
            <span className={cn("flex items-center gap-1", task.checklistDone === task.checklistTotal && "text-success")}>
              <CheckSquare size={12} /> {task.checklistDone}/{task.checklistTotal}
            </span>
          )}
          {!!task.commentCount && (
            <span className="flex items-center gap-1"><MessageSquare size={12} /> {task.commentCount}</span>
          )}
          {!!task.fileCount && (
            <span className="flex items-center gap-1"><Paperclip size={12} /> {task.fileCount}</span>
          )}
        </div>
      ) : null}

      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={assignee?.initials ?? "?"} size={30} className="text-[11px]" />
          <span className="truncate text-[14.5px] text-[#C9C9CF]">{assignee?.name.split(" ")[0] ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[13.5px]",
              tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-[#9A9AA2]"
            )}
          >
            <Clock size={17} strokeWidth={1.75} />
            {dueLabel(task.dueDate)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openTask(task.id);
            }}
            className="focus-ring rounded-md p-1 text-[#8E8E96] hover:bg-white/5 hover:text-white"
            aria-label="Abrir detalhes"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
