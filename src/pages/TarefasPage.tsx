import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  LayoutGrid,
  List,
  CalendarDays,
  MoreHorizontal,
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  ArrowDownWideNarrow,
  Download,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { ProgressWidget } from "../components/layout/Sidebar";
import { Loading, LoadError } from "../components/ui/Loading";
import { Menu, MENU_DIVIDER, type MenuEntry } from "../components/ui/Menu";
import { TaskBoard } from "../components/tarefas/TaskBoard";
import { TaskListView } from "../components/tarefas/TaskListView";
import { TaskCalendar } from "../components/tarefas/TaskCalendar";
import { useSession } from "../context/SessionContext";
import { useTasks } from "../context/TasksContext";
import { useUI } from "../context/UIContext";
import { isGlobalRole } from "../lib/permissions";
import { PRIORITY_META, STATUS_LABEL } from "../lib/labels";
import type { Sector, Task } from "../lib/types";
import { cn } from "../lib/cn";

type Scope = "minhas" | "setor" | "todas";
type View = "quadro" | "lista" | "calendario";
type Sort = "prioridade" | "prazo" | "recentes";

const VIEW_KEY = "ci.tarefas.view";
const readView = (): View => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "lista" || v === "calendario" ? v : "quadro";
  } catch {
    return "quadro";
  }
};

export function TarefasPage() {
  const { currentUser, allUsers } = useSession();
  const { tasks, loading, error, reload } = useTasks();
  const { openNewTask } = useUI();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState<Scope>("setor");
  const [view, setViewState] = useState<View>(readView);
  const [sort, setSort] = useState<Sort>("prioridade");
  const [hideDone, setHideDone] = useState(false);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sem armazenamento: só não lembra a escolha */
    }
  };

  const canSeeAll = isGlobalRole(currentUser.role);
  const sectorFilter = params.get("setor") as Sector | null;
  const personFilter = params.get("pessoa");
  const person = allUsers.find((u) => u.id === personFilter);
  // Filtros vindos da busca sobrepõem o escopo.
  const effectiveScope: Scope = sectorFilter || personFilter ? "todas" : scope === "todas" && !canSeeAll ? "setor" : scope;

  const visible = useMemo(() => {
    const list = tasks.filter((t) => {
      if (sectorFilter && t.sector !== sectorFilter) return false;
      if (personFilter && t.assigneeId !== personFilter) return false;
      if (hideDone && t.status === "done") return false;
      if (effectiveScope === "minhas") return t.assigneeId === currentUser.id;
      if (effectiveScope === "setor") return t.sector === currentUser.sector;
      return true;
    });
    const by: Record<Sort, (a: Task, b: Task) => number> = {
      prioridade: (a, b) =>
        PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"),
      prazo: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
      recentes: (a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
    };
    return [...list].sort(by[sort]);
  }, [tasks, sectorFilter, personFilter, hideDone, effectiveScope, currentUser, sort]);

  function clearFilter(key: "setor" | "pessoa") {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete(key);
      return next;
    });
  }

  function exportCsv() {
    const name = (id: string) => allUsers.find((u) => u.id === id)?.name ?? "";
    const rows = [
      ["Título", "Status", "Prioridade", "Setor", "Responsável", "Prazo", "Tags", "Checklist"],
      ...visible.map((t) => [
        t.title,
        STATUS_LABEL[t.status],
        PRIORITY_META[t.priority].label,
        t.sector,
        name(t.assigneeId),
        t.dueDate ?? "",
        (t.tags ?? []).join(", "),
        t.checklistTotal ? `${t.checklistDone}/${t.checklistTotal}` : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tarefas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const scopes: { value: Scope; label: string }[] = [
    { value: "minhas", label: "Minhas" },
    { value: "setor", label: `Setor ${currentUser.sector}` },
    ...(canSeeAll ? [{ value: "todas" as Scope, label: "Todas" }] : []),
  ];

  const views: { value: View; label: string; icon: typeof List }[] = [
    { value: "quadro", label: "Quadro", icon: LayoutGrid },
    { value: "lista", label: "Lista", icon: List },
    { value: "calendario", label: "Calendário", icon: CalendarDays },
  ];

  const options: MenuEntry[] = [
    ...views.map((v) => ({
      label: `Ver como ${v.label.toLowerCase()}`,
      icon: <v.icon size={15} />,
      checked: view === v.value,
      onSelect: () => setView(v.value),
    })),
    MENU_DIVIDER,
    {
      label: hideDone ? "Mostrar concluídas" : "Ocultar concluídas",
      icon: hideDone ? <Eye size={15} /> : <EyeOff size={15} />,
      onSelect: () => setHideDone((v) => !v),
    },
    { label: "Ordenar por prioridade", icon: <ArrowDownWideNarrow size={15} />, checked: sort === "prioridade", onSelect: () => setSort("prioridade") },
    { label: "Ordenar por prazo", icon: <ArrowDownWideNarrow size={15} />, checked: sort === "prazo", onSelect: () => setSort("prazo") },
    { label: "Mais recentes primeiro", icon: <ArrowDownWideNarrow size={15} />, checked: sort === "recentes", onSelect: () => setSort("recentes") },
    MENU_DIVIDER,
    { label: "Exportar CSV", icon: <Download size={15} />, onSelect: exportCsv },
    { label: "Atualizar", icon: <RefreshCw size={15} />, onSelect: reload },
  ];

  return (
    <div className="space-y-7 lg:space-y-8">
      <PageHeader
        title="Tarefas"
        description="Acompanhamento do andamento por setor e responsável. Cada pessoa vê o que é seu e o do seu setor; diretores e C-level distribuem conforme a permissão."
        shortDescription="Acompanhamento do andamento por setor e responsável. Cada pessoa vê o que é seu."
        action={
          <button onClick={() => openNewTask()} className="btn-primary h-11 px-4 text-[15px] sm:h-[50px] sm:px-6 sm:text-[16px]">
            <Plus size={20} strokeWidth={2.25} /> Nova tarefa
          </button>
        }
      />

      {/* Barra de filtros e visões */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
        <div className="flex h-12 items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 sm:h-[54px]">
          {scopes.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setScope(s.value);
                clearFilter("setor");
                clearFilter("pessoa");
              }}
              className={cn(
                "h-full rounded-xl px-2.5 text-[14px] transition-all sm:px-5 sm:text-[15px]",
                effectiveScope === s.value && !sectorFilter && !personFilter
                  ? "bg-gradient-to-b from-[#FF6A14] to-[#F25500] font-medium text-white shadow-[0_6px_20px_-6px_rgba(255,92,0,0.8)]"
                  : "text-[#D4D4D8] hover:text-white"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="hidden text-[15px] text-[#C9C9CF] sm:inline">
          <span className="tabular-nums">{visible.length}</span> tarefa{visible.length !== 1 && "s"}
        </span>

        {(sectorFilter || person) && (
          <div className="flex flex-wrap gap-2">
            {sectorFilter && <FilterChip label={`Setor ${sectorFilter}`} onClear={() => clearFilter("setor")} />}
            {person && <FilterChip label={person.name} onClear={() => clearFilter("pessoa")} />}
          </div>
        )}

        <div className="flex-1" />

        <div className="hidden h-[54px] items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 sm:flex">
          {views.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "flex h-full items-center gap-2 rounded-xl border px-4 text-[15px] transition-colors",
                view === v.value
                  ? "border-accent/50 bg-accent/[0.12] font-medium text-accent"
                  : "border-transparent text-[#D4D4D8] hover:text-white"
              )}
            >
              <v.icon size={18} strokeWidth={1.75} />
              {v.label}
            </button>
          ))}
        </div>
        <Menu
          items={options}
          width={240}
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="focus-ring grid h-12 w-12 place-items-center rounded-2xl sm:h-[54px] sm:w-[54px] border border-white/[0.08] bg-white/[0.02] text-[#D4D4D8] hover:border-white/20 hover:text-white"
              aria-label="Opções de visualização"
            >
              <MoreHorizontal size={22} className="hidden sm:block" />
              <SlidersHorizontal size={21} className="sm:hidden" />
            </button>
          )}
        />
      </div>

      {error ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && tasks.length === 0 ? (
        <Loading label="Carregando tarefas…" />
      ) : view === "lista" ? (
        <TaskListView tasks={visible} />
      ) : view === "calendario" ? (
        <TaskCalendar tasks={visible} />
      ) : (
        <TaskBoard tasks={visible} />
      )}

      <ProgressWidget className="lg:hidden" />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[13px] text-accent">
      {label}
      <button onClick={onClear} aria-label={`Remover filtro ${label}`} className="hover:text-white">
        <X size={13} />
      </button>
    </span>
  );
}
