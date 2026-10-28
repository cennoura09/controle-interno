import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Layers, CornerDownLeft, UsersRound } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { useTasks } from "../../context/TasksContext";
import { useSession } from "../../context/SessionContext";
import { Avatar, PriorityBadge } from "../ui/Badge";
import { SECTORS, STATUS_LABEL } from "../../lib/labels";
import { NAV } from "./nav";
import { cn } from "../../lib/cn";

interface Result {
  id: string;
  group: string;
  title: string;
  hint?: string;
  icon: ReactNode;
  right?: ReactNode;
  run: () => void;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca global (⌘K): tarefas, pessoas, setores, páginas e ações. */
export function CommandPalette() {
  const { paletteOpen, closePalette, openNewTask, setTeamOpen } = useUI();
  const { tasks, openTask } = useTasks();
  const { users } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  const results = useMemo<Result[]>(() => {
    const q = norm(query.trim());
    const match = (...fields: (string | undefined)[]) => !q || fields.some((f) => f && norm(f).includes(q));
    const go = (fn: () => void) => () => {
      closePalette();
      fn();
    };
    const out: Result[] = [];

    if (match("nova tarefa", "criar tarefa"))
      out.push({ id: "a-new", group: "Ações", title: "Nova tarefa", icon: <Plus size={16} />, run: go(() => openNewTask()) });
    if (match("equipe", "gerenciar equipe", "membros"))
      out.push({ id: "a-team", group: "Ações", title: "Gerenciar equipe", icon: <UsersRound size={16} />, run: go(() => setTeamOpen(true)) });

    tasks
      .filter((t) => match(t.title, t.description, ...(t.tags ?? []), t.sector))
      .slice(0, q ? 8 : 5)
      .forEach((t) => {
        const assignee = users.find((u) => u.id === t.assigneeId);
        out.push({
          id: `t-${t.id}`,
          group: "Tarefas",
          title: t.title,
          hint: `${STATUS_LABEL[t.status]} · ${t.sector}${assignee ? ` · ${assignee.name}` : ""}`,
          icon: <span className={cn("h-2 w-2 rounded-full", t.status === "done" ? "bg-success" : "bg-accent")} />,
          right: <PriorityBadge priority={t.priority} />,
          run: go(() => {
            navigate("/tarefas");
            openTask(t.id);
          }),
        });
      });

    users
      .filter((u) => match(u.name, u.title, u.email ?? undefined, u.role))
      .slice(0, q ? 6 : 3)
      .forEach((u) =>
        out.push({
          id: `u-${u.id}`,
          group: "Pessoas",
          title: u.name,
          hint: `${u.role} · ${u.sector}`,
          icon: <Avatar initials={u.initials} size={22} />,
          run: go(() => navigate(`/tarefas?pessoa=${u.id}`)),
        })
      );

    SECTORS.filter((s) => match(s, "setor")).forEach((s) =>
      out.push({
        id: `s-${s}`,
        group: "Setores",
        title: `Setor ${s}`,
        hint: `${tasks.filter((t) => t.sector === s && t.status !== "done").length} tarefas abertas`,
        icon: <Layers size={16} />,
        run: go(() => navigate(`/tarefas?setor=${s}`)),
      })
    );

    NAV.filter((n) => match(n.label)).forEach((n) =>
      out.push({
        id: `p-${n.to}`,
        group: "Páginas",
        title: n.label,
        icon: <n.icon size={16} />,
        run: go(() => navigate(n.to)),
      })
    );
    return out;
  }, [query, tasks, users, closePalette, openNewTask, setTeamOpen, navigate, openTask]);

  useEffect(() => setActive(0), [query]);

  if (!paletteOpen) return null;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Escape") {
      closePalette();
    }
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={closePalette} aria-hidden />
      <div
        role="dialog"
        aria-label="Buscar"
        className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-[0_40px_120px_-30px_rgba(0,0,0,1),0_0_0_1px_rgba(255,92,0,0.15)]"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5">
          <Search size={20} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar tarefas, pessoas, setores..."
            className="h-14 flex-1 bg-transparent text-[15px] text-content outline-none placeholder:text-muted-2"
          />
          <kbd className="rounded border border-white/10 px-1.5 font-mono text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[420px] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">Nada encontrado para "{query}".</li>
          )}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <li key={r.id}>
                {header && <div className="mono-label px-5 pb-1 pt-3 text-[10px]">{header}</div>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={r.run}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-2.5 text-left",
                    i === active ? "bg-accent/10" : "hover:bg-white/[0.03]"
                  )}
                >
                  <span className="grid w-6 shrink-0 place-items-center text-muted">{r.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-content">{r.title}</span>
                    {r.hint && <span className="block truncate text-[11px] text-muted">{r.hint}</span>}
                  </span>
                  {r.right}
                  {i === active && <CornerDownLeft size={14} className="text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
