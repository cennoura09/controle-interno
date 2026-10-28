import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Task } from "../../lib/types";
import { useTasks } from "../../context/TasksContext";
import { useUI } from "../../context/UIContext";
import { PRIORITY_META } from "../../lib/labels";
import { toISO, todayISO } from "../../lib/dates";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Calendário mensal pelos prazos. Clique num dia vazio cria tarefa com prazo. */
export function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const { openTask } = useTasks();
  const { openNewTask } = useUI();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = todayISO();

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    });
    return map;
  }, [tasks]);

  const noDue = tasks.filter((t) => !t.dueDate && t.status !== "done");
  const label = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div className="space-y-4">
      <div className="panel p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="text-lg font-semibold capitalize text-white">{label}</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#C9C9CF] hover:border-white/20"
            >
              Hoje
            </button>
            <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-white" aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-white" aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-[#111113] py-2 text-center font-mono text-[10.5px] uppercase tracking-wider text-muted">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const list = byDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                className={cn(
                  "group relative min-h-[76px] bg-[#0F0F11] p-1.5 sm:min-h-[108px]",
                  !inMonth && "bg-[#0B0B0D] opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-[12px]",
                      iso === today ? "bg-accent font-semibold text-white" : "text-[#9A9AA2]"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <button
                    onClick={() => openNewTask("todo", iso)}
                    className="rounded p-0.5 text-muted opacity-0 transition hover:text-accent group-hover:opacity-100"
                    aria-label={`Nova tarefa em ${iso}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 truncate rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-1 text-left text-[11px] text-[#D4D4D8] hover:border-white/20",
                        t.status === "done" && "text-muted line-through"
                      )}
                      title={t.title}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_META[t.priority].dot)} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                  {list.length > 3 && <div className="px-1 text-[10.5px] text-muted">+{list.length - 3} tarefas</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {noDue.length > 0 && (
        <div className="panel p-4">
          <div className="mono-label mb-3">Sem prazo · {noDue.length}</div>
          <div className="flex flex-wrap gap-2">
            {noDue.map((t) => (
              <button
                key={t.id}
                onClick={() => openTask(t.id)}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[13px] text-[#D4D4D8] hover:border-white/20"
              >
                <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[t.priority].dot)} />
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
