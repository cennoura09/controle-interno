import { Clock } from "lucide-react";
import type { Task } from "../../lib/types";
import { getUser } from "../../data/users";
import { Avatar, Badge, PriorityBadge } from "../ui/Badge";
import { shortDate } from "../../lib/format";

export function TaskCard({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (id: string) => void;
}) {
  const assignee = getUser(task.assigneeId);
  const creator = getUser(task.createdById);
  const assignedByOther =
    creator && assignee && creator.id !== assignee.id;

  return (
    <article
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="card cursor-grab p-3.5 transition-colors hover:border-muted-2 active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="neutral">{task.sector}</Badge>
        <PriorityBadge priority={task.priority} />
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
