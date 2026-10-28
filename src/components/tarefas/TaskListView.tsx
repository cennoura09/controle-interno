import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MoreVertical } from "lucide-react";
import type { Task, TaskStatus } from "../../lib/types";
import { useTasks } from "../../context/TasksContext";
import { useSession } from "../../context/SessionContext";
import { canMoveTask } from "../../lib/permissions";
import { PRIORITY_META, STATUS_LABEL, STATUS_META, STATUS_ORDER } from "../../lib/labels";
import { dueLabel, dueTone } from "../../lib/dates";
import { Avatar, PriorityBadge } from "../ui/Badge";
import { TaskMenu } from "./TaskMenu";
import { cn } from "../../lib/cn";

type SortKey = "title" | "status" | "assignee" | "dueDate" | "priority";

/** Visão em tabela, ordenável, com troca rápida de status. */
export function TaskListView({ tasks }: { tasks: Task[] }) {
  const { currentUser, allUsers } = useSession();
  const { openTask, move } = useTasks();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "dueDate", dir: 1 });

  const name = (id: string) => allUsers.find((u) => u.id === id)?.name ?? "";
  const sorted = useMemo(() => {
    const val = (t: Task): string | number => {
      switch (sort.key) {
        case "title": return t.title.toLowerCase();
        case "status": return STATUS_ORDER.indexOf(t.status);
        case "assignee": return name(t.assigneeId).toLowerCase();
        case "priority": return PRIORITY_META[t.priority].rank;
        default: return t.dueDate ?? "9999";
      }
    };
    return [...tasks].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sort, allUsers]);

  const th = (key: SortKey, label: string, cls = "") => (
    <th className={cn("px-4 py-3 font-medium", cls)}>
      <button
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
        className="inline-flex items-center gap-1 hover:text-content"
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  if (tasks.length === 0) {
    return <div className="panel px-6 py-16 text-center text-sm text-muted">Nenhuma tarefa neste filtro.</div>;
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
              {th("title", "Tarefa")}
              {th("status", "Status")}
              {th("assignee", "Responsável")}
              <th className="px-4 py-3 font-medium">Setor</th>
              {th("dueDate", "Prazo")}
              {th("priority", "Prioridade")}
              <th className="px-4 py-3 font-medium">Checklist</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const assignee = allUsers.find((u) => u.id === t.assigneeId);
              const tone = dueTone(t.dueDate, t.status === "done");
              return (
                <tr
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  className="cursor-pointer border-b border-white/[0.05] last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="max-w-[340px] px-4 py-3.5">
                    <div className={cn("truncate font-medium text-white", t.status === "done" && "text-muted line-through")}>
                      {t.title}
                    </div>
                    {!!t.tags?.length && (
                      <div className="mt-1 flex gap-1">
                        {t.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-muted">{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <span className="relative inline-flex items-center">
                      <span className={cn("pointer-events-none absolute left-2.5 h-2 w-2 rounded-full", STATUS_META[t.status].dot)} />
                      <select
                        value={t.status}
                        disabled={!canMoveTask(currentUser, t)}
                        onChange={(e) => void move(t.id, e.target.value as TaskStatus)}
                        className="cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-6 pr-3 text-[13px] text-content outline-none hover:border-white/20 disabled:cursor-default"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-2">
                      <Avatar initials={assignee?.initials ?? "?"} size={26} />
                      <span className="truncate text-[#C9C9CF]">{assignee?.name ?? "—"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-wider text-muted">{t.sector}</td>
                  <td className={cn("px-4 py-3.5", tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-muted")}>
                    {dueLabel(t.dueDate)}
                  </td>
                  <td className="px-4 py-3.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3.5 font-mono text-[12px] text-muted">
                    {t.checklistTotal ? `${t.checklistDone}/${t.checklistTotal}` : "—"}
                  </td>
                  <td className="px-2 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <TaskMenu
                      task={t}
                      trigger={(toggle) => (
                        <button onClick={toggle} className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-white" aria-label="Ações">
                          <MoreVertical size={16} />
                        </button>
                      )}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
