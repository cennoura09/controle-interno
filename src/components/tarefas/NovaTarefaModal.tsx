import { useEffect, useMemo, useState } from "react";
import { Info, Lock, Check, Users } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar, Badge } from "../ui/Badge";
import { useSession } from "../../context/SessionContext";
import {
  assignmentScopeLabel,
  getAssignableTargets,
  isGlobalRole,
} from "../../lib/permissions";
import type { Sector, Task, TaskPriority, User } from "../../lib/types";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

// Ordem de exibição dos setores no agrupamento.
const SECTOR_ORDER: Sector[] = [
  "Executivo",
  "Marketing",
  "Comercial",
  "Financeiro",
  "Operacional",
];

const fieldCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-content placeholder:text-muted-2 focus-ring";
const labelCls = "mono-label mb-1.5 block";

export function NovaTarefaModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  /** Gera uma tarefa por pessoa selecionada. */
  onCreate: (tasks: Task[]) => void;
}) {
  const { currentUser, users } = useSession();

  // PERMISSÃO: lista de destinatários permitidos para o usuário atual.
  const targets = useMemo(
    () => getAssignableTargets(currentUser, users),
    [currentUser, users]
  );
  const targetIds = useMemo(() => new Set(targets.map((t) => t.id)), [targets]);
  const onlySelf = targets.length === 1;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.id]);
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");

  // Ao trocar de cargo (ou abrir), reinicia a seleção para o próprio usuário.
  useEffect(() => {
    setSelectedIds([currentUser.id]);
  }, [currentUser.id]);

  // Mantém apenas selecionados que o cargo atual permite.
  const validSelected = selectedIds.filter((id) => targetIds.has(id));
  const selectedUsers: User[] = targets.filter((t) => validSelected.includes(t.id));

  // Setores envolvidos (o setor de cada tarefa segue o responsável).
  const sectors = [...new Set(selectedUsers.map((u) => u.sector))];

  // Agrupa os destinatários por setor para exibição.
  const groups = SECTOR_ORDER.map((sector) => ({
    sector,
    members: targets.filter((t) => t.sector === sector),
  })).filter((g) => g.members.length > 0);

  function toggle(id: string) {
    if (onlySelf) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function reset() {
    setTitle("");
    setDescription("");
    setSelectedIds([currentUser.id]);
    setPriority("media");
    setDueDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || selectedUsers.length === 0) return;
    const now = Date.now();
    const createdAt = new Date().toISOString().slice(0, 10);
    // Uma tarefa por pessoa selecionada (cada uma com seu responsável/setor).
    const tasks: Task[] = selectedUsers.map((u, i) => ({
      id: `t-${now}-${i}`,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "todo",
      priority,
      sector: u.sector,
      assigneeId: u.id,
      createdById: currentUser.id,
      dueDate: dueDate || undefined,
      createdAt,
    }));
    onCreate(tasks);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      description="Registre uma tarefa para você ou para uma ou mais pessoas do seu escopo."
    >
      {/* Aviso de escopo de permissão */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs">
        {onlySelf ? (
          <Lock size={14} className="mt-0.5 text-muted" />
        ) : (
          <Info size={14} className="mt-0.5 text-accent" />
        )}
        <div className="text-muted">
          Você está como <span className="text-content">{currentUser.name}</span>{" "}
          <Badge tone="accent">{currentUser.role}</Badge>. Pode atribuir para:{" "}
          <span className="text-content">{assignmentScopeLabel(currentUser)}</span>.
          {isGlobalRole(currentUser.role) && " (acesso total)"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="t-title">Título</label>
          <input
            id="t-title"
            className={fieldCls}
            placeholder="Ex.: Otimizar campanha de tráfego"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="t-desc">Descrição (opcional)</label>
          <textarea
            id="t-desc"
            className={fieldCls + " min-h-[64px] resize-y"}
            placeholder="Contexto, critérios de conclusão…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Atribuir para — seleção MÚLTIPLA */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelCls + " mb-0 flex items-center gap-1.5"}>
              <Users size={12} />
              Atribuir para
              {onlySelf && <Lock size={10} className="inline align-baseline" />}
            </label>
            {!onlySelf && (
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-muted-2">{selectedUsers.length} selec.</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(targets.map((t) => t.id))}
                  className="text-accent hover:underline"
                >
                  Todos
                </button>
                <span className="text-muted-2">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-muted hover:text-content hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-bg p-1.5">
            {groups.map((group) => (
              <div key={group.sector} className="mb-1 last:mb-0">
                {!onlySelf && (
                  <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-2">
                    {group.sector}
                  </div>
                )}
                {group.members.map((u) => {
                  const checked = validSelected.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggle(u.id)}
                      disabled={onlySelf}
                      className={
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed " +
                        (checked ? "bg-accent-soft" : "hover:bg-surface-2")
                      }
                    >
                      <span
                        className={
                          "grid h-4 w-4 shrink-0 place-items-center rounded border " +
                          (checked
                            ? "border-accent bg-accent text-black"
                            : "border-border bg-surface")
                        }
                      >
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      <Avatar initials={u.initials} size={24} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm">
                          {u.name}
                          {u.id === currentUser.id && (
                            <span className="text-muted"> (você)</span>
                          )}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {u.role} · {u.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {onlySelf ? (
            <p className="mt-1 text-[11px] text-muted-2">
              Seu cargo só permite criar tarefas para você mesmo.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-2">
              Será criada uma tarefa para cada pessoa selecionada.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="t-priority">Prioridade</label>
            <select
              id="t-priority"
              className={fieldCls}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="t-due">Prazo</label>
            <input
              id="t-due"
              type="date"
              className={fieldCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Setor(es) (automático)</label>
          <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
            {sectors.length > 0 ? (
              sectors.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)
            ) : (
              <span className="text-muted-2">Selecione ao menos uma pessoa</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] text-muted-2">
            {selectedUsers.length > 0 &&
              `${selectedUsers.length} tarefa${selectedUsers.length > 1 ? "s" : ""} será${selectedUsers.length > 1 ? "ão" : ""} criada${selectedUsers.length > 1 ? "s" : ""}`}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || selectedUsers.length === 0}
            >
              {selectedUsers.length > 1 ? "Criar tarefas" : "Criar tarefa"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
