import { useMemo, useState } from "react";
import { Info, Lock } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useSession } from "../../context/SessionContext";
import {
  assignmentScopeLabel,
  getAssignableTargets,
  isGlobalRole,
} from "../../lib/permissions";
import type { Task, TaskPriority } from "../../lib/types";
import { getUser, USERS } from "../../data/users";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
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
  onCreate: (task: Task) => void;
}) {
  const { currentUser } = useSession();

  // PERMISSÃO: lista de destinatários permitidos para o usuário atual.
  const targets = useMemo(
    () => getAssignableTargets(currentUser, USERS),
    [currentUser]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");

  // Mantém o destinatário válido ao trocar de cargo.
  const validAssigneeId = targets.some((t) => t.id === assigneeId)
    ? assigneeId
    : currentUser.id;

  const assignee = getUser(validAssigneeId);
  const onlySelf = targets.length === 1;

  function reset() {
    setTitle("");
    setDescription("");
    setAssigneeId(currentUser.id);
    setPriority("media");
    setDueDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assignee) return;
    onCreate({
      id: `t-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "todo",
      priority,
      sector: assignee.sector, // setor segue o responsável
      assigneeId: assignee.id,
      createdById: currentUser.id,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      description="Registre uma tarefa para você ou para o seu escopo."
    >
      {/* Aviso de escopo de permissão */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs">
        {onlySelf ? <Lock size={14} className="mt-0.5 text-muted" /> : <Info size={14} className="mt-0.5 text-accent" />}
        <div className="text-muted">
          Você está como{" "}
          <span className="text-content">{currentUser.name}</span>{" "}
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
            className={fieldCls + " min-h-[70px] resize-y"}
            placeholder="Contexto, critérios de conclusão…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="t-assignee">
              Atribuir para {onlySelf && <Lock size={10} className="ml-1 inline align-baseline" />}
            </label>
            <select
              id="t-assignee"
              className={fieldCls + " disabled:opacity-60"}
              value={validAssigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={onlySelf}
            >
              {targets.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role} · {u.sector}
                  {u.id === currentUser.id ? " (você)" : ""}
                </option>
              ))}
            </select>
            {onlySelf && (
              <p className="mt-1 text-[11px] text-muted-2">
                Seu cargo só permite criar tarefas para você mesmo.
              </p>
            )}
          </div>

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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div>
            <label className={labelCls}>Setor (automático)</label>
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-surface-2 px-3 text-sm text-muted">
              {assignee?.sector ?? "—"}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Criar tarefa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
