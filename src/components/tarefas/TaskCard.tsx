import { Clock, Trash2 } from "lucide-react";
import type { Task } from "../../lib/types";
import { useSession } from "../../context/SessionContext";
import { canDeleteTask, canMoveTask } from "../../lib/permissions";
import { Avatar, Badge, PriorityBadge } from "../ui/Badge";
import { shortDate } from "../../lib/format";
import { cn } from "../../lib/cn";

export function TaskCard({
  task,
  onDragStart,
  onDelete,
}: {
  task: Task;
  onDragStart: (id: string) => void;
  onDelete: (task: Task) => void;
}) {
  const { currentUser, allUsers } = useSession();
  const assignee = allUsers.find((u) => u.id === task.assigneeId);
  const creator = allUsers.find((u) => u.id === task.createdById);
  const assignedByOther =
    creator && assignee && creator.id !== assignee.id;
  const movable = canMoveTask(currentUser, task);

  return (
    <article
      draggable={movable}
      onDragStart={() => onDragStart(task.id)}
      className={cn(
        "card group p-3.5 transition-colors hover:border-muted-2",
        movable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      )}
      title={movable ? undefined : "Você não pode mover esta tarefa"}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="neutral">{task.sector}</Badge>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {canDeleteTask(currentUser, task) && (
            <button
              onClick={() => onDelete(task)}
              className="focus-ring rounded p-1 text-muted-2 opacity-60 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
              aria-label={`Excluir tarefa ${task.title}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <div className="flex items-center gap-2">
          <Avatar initials={assignee?.initials ?? "?"} size={22} />
          <span className="text-xs text-muted">{assignee?.name.split(" ")[0]}</span>
        </div>
        <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
          <Clock size={12} />
          {shortDate(task.dueDate)}
        </span>
      </div>

      {assignedByOther && (
        <div className="mt-2 font-mono text-[10px] text-muted-2">
          atribuída por {creator?.name.split(" ")[0]} ({creator?.role})
        </div>
      )}
    </article>
  );
}
