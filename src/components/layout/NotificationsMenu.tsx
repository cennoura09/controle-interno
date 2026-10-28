import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { data } from "../../services";
import { useSession } from "../../context/SessionContext";
import { useTasks } from "../../context/TasksContext";
import type { AppNotification } from "../../lib/types";
import { relativeTime } from "../../lib/dates";
import { Avatar } from "../ui/Badge";
import { Popover, useDismiss } from "../ui/Menu";
import { cn } from "../../lib/cn";

/** Sino com notificações do usuário (atribuições, comentários, status). */
export function NotificationsMenu({ size = 44 }: { size?: number }) {
  const { allUsers } = useSession();
  const { openTask } = useTasks();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const load = useCallback(() => {
    data.listNotifications().then(setItems).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await data.markNotificationsRead().catch(() => load());
  }

  function select(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void data.markNotificationsRead([n.id]).catch(() => undefined);
    }
    if (n.taskId) openTask(n.taskId);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="focus-ring relative grid place-items-center rounded-xl text-[#C9C9CF] transition-colors hover:bg-white/5 hover:text-white"
        style={{ width: size, height: size }}
        aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}
      >
        <Bell size={24} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-[9px] top-[8px] h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent shadow-[0_0_8px_rgba(255,92,0,0.9)]" />
        )}
      </button>

      {open && (
        <Popover width={360} className="right-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Notificações</div>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-accent hover:underline">
                <CheckCheck size={14} /> Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">Nenhuma notificação por aqui.</li>
            )}
            {items.map((n) => {
              const actor = allUsers.find((u) => u.id === n.actorId);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => select(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                      !n.read && "bg-accent/[0.05]"
                    )}
                  >
                    <Avatar initials={actor?.initials ?? "?"} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-content">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover>
      )}
    </div>
  );
}
