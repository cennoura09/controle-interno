import type { ReactNode } from "react";
import { ExternalLink, Copy, Trash2, ArrowRight, Link2 } from "lucide-react";
import { Menu, MENU_DIVIDER, type MenuEntry } from "../ui/Menu";
import { useTasks } from "../../context/TasksContext";
import { useSession } from "../../context/SessionContext";
import { canDeleteTask, canMoveTask } from "../../lib/permissions";
import { STATUS_LABEL, STATUS_ORDER } from "../../lib/labels";
import type { Task } from "../../lib/types";

/** Ações da tarefa: abrir, mover de coluna, duplicar, copiar link, excluir. */
export function useTaskActions(task: Task): MenuEntry[] {
  const { currentUser } = useSession();
  const { openTask, move, create, remove } = useTasks();
  const movable = canMoveTask(currentUser, task);

  const items: MenuEntry[] = [
    { label: "Abrir detalhes", icon: <ExternalLink size={15} />, onSelect: () => openTask(task.id) },
    MENU_DIVIDER,
    ...STATUS_ORDER.filter((s) => s !== task.status).map((s) => ({
      label: `Mover para ${STATUS_LABEL[s]}`,
      icon: <ArrowRight size={15} />,
      disabled: !movable,
      onSelect: () => void move(task.id, s),
    })),
    MENU_DIVIDER,
    {
      label: "Duplicar",
      icon: <Copy size={15} />,
      onSelect: () =>
        void create([
          {
            title: `${task.title} (cópia)`,
            description: task.description,
            priority: task.priority,
            sector: task.sector,
            assigneeId: task.assigneeId,
            createdById: currentUser.id,
            dueDate: task.dueDate,
            tags: task.tags,
          },
        ]).catch(() => undefined),
    },
    {
      label: "Copiar link",
      icon: <Link2 size={15} />,
      onSelect: () => {
        const url = `${window.location.origin}${window.location.pathname}#/tarefas?tarefa=${task.id}`;
        void navigator.clipboard?.writeText(url);
      },
    },
  ];
  if (canDeleteTask(currentUser, task)) {
    items.push({
      label: "Excluir",
      icon: <Trash2 size={15} />,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Excluir a tarefa "${task.title}"?`)) void remove(task.id);
      },
    });
  }
  return items;
}

export function TaskMenu({ task, trigger }: { task: Task; trigger: (toggle: () => void) => ReactNode }) {
  const items = useTaskActions(task);
  return <Menu items={items} width={230} trigger={({ toggle }) => trigger(toggle)} />;
}
