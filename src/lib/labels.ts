// Rótulos e cores compartilhados (status, prioridade, setores).
import type { Sector, TaskPriority, TaskStatus } from "./types";

export const STATUS_META: Record<
  TaskStatus,
  { label: string; index: string; dot: string; text: string; border: string; empty: string; emptySub: string }
> = {
  todo: {
    label: "A Fazer",
    index: "01",
    dot: "bg-accent",
    text: "text-accent",
    border: "before:bg-accent",
    empty: "Sem tarefas a fazer",
    emptySub: "Crie uma nova tarefa para começar.",
  },
  doing: {
    label: "Em Andamento",
    index: "02",
    dot: "bg-[#FF8A1F]",
    text: "text-[#FF8A1F]",
    border: "before:bg-[#FF8A1F]",
    empty: "Sem tarefas em andamento",
    emptySub: "Arraste uma tarefa para cá ou crie uma nova.",
  },
  done: {
    label: "Concluída",
    index: "03",
    dot: "bg-success",
    text: "text-success",
    border: "before:bg-success",
    empty: "Sem tarefas concluídas",
    emptySub: "As tarefas finalizadas aparecerão aqui.",
  },
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

/** Rótulo em caixa normal ("A fazer"), para selects e textos. */
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluída",
};

export const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; text: string; rank: number }> = {
  baixa: { label: "Baixa", dot: "bg-success", text: "text-success", rank: 0 },
  media: { label: "Média", dot: "bg-info", text: "text-info", rank: 1 },
  alta: { label: "Alta", dot: "bg-accent", text: "text-accent", rank: 2 },
  urgente: { label: "Urgente", dot: "bg-danger", text: "text-danger", rank: 3 },
};

export const PRIORITIES: TaskPriority[] = ["baixa", "media", "alta", "urgente"];

export const SECTORS: Sector[] = ["Executivo", "Marketing", "Comercial", "Financeiro", "Operacional"];
