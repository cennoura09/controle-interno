import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  MoreVertical,
  ChevronDown,
  Play,
  CheckCircle2,
  RotateCcw,
  UserRound,
  UsersRound,
  CalendarDays,
  Flag,
  Pencil,
  Plus,
  Trash2,
  Tag,
  Paperclip,
  MessageSquare,
  SendHorizontal,
  FileText,
  File as FileIcon,
  Upload,
  Download,
  Loader2,
  History,
  Link2,
  ExternalLink,
} from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { LogoMark } from "../ui/Logo";
import { Avatar, PriorityBadge } from "../ui/Badge";
import { Menu, MENU_DIVIDER, type MenuEntry } from "../ui/Menu";
import { useTasks } from "../../context/TasksContext";
import { useSession } from "../../context/SessionContext";
import { useTaskActions } from "./TaskMenu";
import { data } from "../../services";
import { canMoveTask, getAssignableTargets, isGlobalRole, directedSector } from "../../lib/permissions";
import { PRIORITIES, PRIORITY_META, SECTORS, STATUS_LABEL, STATUS_META, STATUS_ORDER } from "../../lib/labels";
import { dueLabel, dueTone, fileSize, longDate, relativeTime } from "../../lib/dates";
import type { ChecklistItem, Task, TaskComment, TaskDetail, TaskFile, TaskPatch, TaskStatus, User } from "../../lib/types";
import { cn } from "../../lib/cn";

type Tab = "descricao" | "checklist" | "comentarios" | "arquivos" | "historico";
const MAX_FILE = 8 * 1024 * 1024;

export function TaskDrawer() {
  const { openTaskId, closeTask } = useTasks();
  return (
    <Drawer open={!!openTaskId} onClose={closeTask} label="Detalhes da tarefa">
      {openTaskId && <TaskDetailView key={openTaskId} id={openTaskId} />}
    </Drawer>
  );
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function TaskDetailView({ id }: { id: string }) {
  const { tasks, loading: tasksLoading, update, closeTask, move } = useTasks();
  const { currentUser, users, allUsers } = useSession();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("descricao");

  const load = useCallback(() => {
    data
      .getTaskDetail(id)
      .then((d) => {
        setDetail(d);
        setLoadError(null);
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, [id]);

  useEffect(load, [load]);

  // A lista global é a fonte mais recente (movimentos pelo quadro etc.).
  const listTask = tasks.find((t) => t.id === id);
  const task: Task | undefined = listTask ? { ...detail?.task, ...listTask } : detail?.task;

  // Tarefa excluída (por aqui ou em outra aba): fecha o painel.
  useEffect(() => {
    if (detail && !tasksLoading && !listTask) closeTask();
  }, [detail, tasksLoading, listTask, closeTask]);

  const userById = useCallback((uid?: string | null) => allUsers.find((u) => u.id === uid), [allUsers]);

  const patch = useCallback(
    async (p: TaskPatch) => {
      setError(null);
      const saved = await update(id, p);
      if (saved) {
        setDetail((d) => (d ? { ...d, task: saved } : d));
        load(); // atualiza histórico
      }
    },
    [id, update, load]
  );

  const actions = useTaskActionsSafe(task);

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-danger">{loadError}</p>
        <button onClick={closeTask} className="rounded-lg border border-border px-3 py-1.5 text-sm">Fechar</button>
      </div>
    );
  }
  if (!detail || !task) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
        <Loader2 size={18} className="animate-spin text-accent" /> Carregando tarefa…
      </div>
    );
  }

  const canEdit = canMoveTask(currentUser, task);
  const assignee = userById(task.assigneeId);
  const summary = task.description?.split("\n").find((l) => l.trim() && !/^\s*[-•*]/.test(l));
  const checklistDone = detail.checklist.filter((c) => c.done).length;

  const next: Record<TaskStatus, { label: string; status: TaskStatus; icon: typeof Play }> = {
    todo: { label: "Marcar como em andamento", status: "doing", icon: Play },
    doing: { label: "Marcar como concluída", status: "done", icon: CheckCircle2 },
    done: { label: "Reabrir tarefa", status: "todo", icon: RotateCcw },
  };
  const primary = next[task.status];

  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: "descricao", label: "Descrição" },
    { id: "checklist", label: "Checklist", count: `${checklistDone}/${detail.checklist.length}` },
    { id: "comentarios", label: "Comentários", count: String(detail.comments.length) },
    { id: "arquivos", label: "Arquivos", count: String(detail.files.length) },
    { id: "historico", label: "Histórico" },
  ];

  const setList = <K extends "checklist" | "comments" | "files">(key: K, fn: (prev: TaskDetail[K]) => TaskDetail[K]) =>
    setDetail((d) => (d ? { ...d, [key]: fn(d[key]) } : d));

  return (
    <div className="flex h-full flex-col">
      {/* Topo */}
      <div className="flex items-center justify-between px-5 pt-5 sm:px-7">
        <div className="flex items-center gap-2 text-[14px] text-[#9A9AA2]">
          <LogoMark size={18} className="shadow-none" />
          <button onClick={closeTask} className="hover:text-white">Tarefas</button>
          <span className="text-[#5E5E66]">/</span>
          <span className="text-white">Detalhes</span>
        </div>
        <div className="flex items-center gap-1">
          <Menu
            items={actions}
            width={230}
            trigger={({ toggle }) => (
              <button onClick={toggle} className="rounded-lg p-2 text-[#C9C9CF] hover:bg-white/5" aria-label="Mais ações">
                <MoreVertical size={19} />
              </button>
            )}
          />
          <button onClick={closeTask} className="rounded-lg p-2 text-[#C9C9CF] hover:bg-white/5" aria-label="Fechar">
            <X size={21} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 sm:px-7">
        {/* Cabeçalho da tarefa */}
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.12em] text-[#D4D4D8]">
                {task.sector}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            <EditableTitle value={task.title} disabled={!canEdit} onSave={(title) => patch({ title })} />
            {summary && <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-[#A6A6AE]">{summary}</p>}
          </div>

          <div className="w-full shrink-0 md:w-[250px]">
            <div className="mb-1.5 text-[13px] text-[#9A9AA2]">Status</div>
            <Menu
              width={250}
              align="left"
              className="w-full"
              items={STATUS_ORDER.map((s) => ({
                label: STATUS_LABEL[s],
                checked: s === task.status,
                disabled: !canEdit,
                icon: <span className={cn("block h-2.5 w-2.5 rounded-full", STATUS_META[s].dot)} />,
                onSelect: () => void move(task.id, s).then(load),
              }))}
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  disabled={!canEdit}
                  className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[15px] text-white hover:border-white/20 disabled:opacity-70"
                >
                  <span className={cn("h-3 w-3 rounded-full", STATUS_META[task.status].dot)} />
                  <span className="flex-1 text-left">{STATUS_LABEL[task.status]}</span>
                  <ChevronDown size={18} className="text-[#C9C9CF]" />
                </button>
              )}
            />
            {canEdit && (
              <button
                onClick={() => void move(task.id, primary.status).then(load)}
                className="btn-primary mt-3 h-12 w-full whitespace-nowrap px-3 text-[14px]"
              >
                <primary.icon size={17} /> {primary.label}
              </button>
            )}
          </div>
        </div>

        {/* Campos */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AssigneeField task={task} assignee={assignee} canEdit={canEdit} onChange={(assigneeId) => patch({ assigneeId })} />
          <SectorField task={task} canEdit={canEdit} onChange={(sector) => patch({ sector })} />
          <DueField task={task} canEdit={canEdit} onChange={(dueDate) => patch({ dueDate })} />
          <InfoCard icon={<Flag size={17} />} label="Prioridade">
            <Menu
              width={180}
              align="left"
              items={PRIORITIES.map((p) => ({
                label: PRIORITY_META[p].label,
                checked: p === task.priority,
                disabled: !canEdit,
                icon: <span className={cn("block h-2.5 w-2.5 rounded-full", PRIORITY_META[p].dot)} />,
                onSelect: () => void patch({ priority: p }),
              }))}
              trigger={({ toggle }) => (
                <button onClick={toggle} disabled={!canEdit} className="flex items-center gap-2.5 text-[16px] text-white disabled:cursor-default">
                  <span className={cn("h-3 w-3 rounded-full", PRIORITY_META[task.priority].dot)} />
                  {PRIORITY_META[task.priority].label}
                </button>
              )}
            />
          </InfoCard>
        </div>

        {error && <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}

        {/* Abas */}
        <div className="no-scrollbar mt-6 flex gap-6 overflow-x-auto border-b border-white/[0.08] sm:gap-7">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 pb-3 text-[15px] transition-colors",
                tab === t.id ? "font-medium text-accent" : "text-[#C9C9CF] hover:text-white"
              )}
            >
              {t.label}
              {t.count !== undefined && <span className={cn("ml-1", tab === t.id ? "text-accent" : "text-[#9A9AA2]")}>({t.count})</span>}
              {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent shadow-[0_0_10px_rgba(255,92,0,0.8)]" />}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "descricao" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                <DescriptionCard value={task.description ?? ""} canEdit={canEdit} onSave={(description) => patch({ description })} />
                <ChecklistCard
                  taskId={task.id}
                  items={detail.checklist}
                  canEdit={canEdit}
                  users={users}
                  userById={userById}
                  onChange={(fn) => setList("checklist", fn)}
                  onError={setError}
                  onLogged={load}
                />
              </div>
              <div className="space-y-4">
                <TagsCard tags={task.tags ?? []} canEdit={canEdit} onSave={(tags) => patch({ tags })} />
                <FilesCard
                  taskId={task.id}
                  files={detail.files}
                  compact
                  canEdit={canEdit}
                  onChange={(fn) => setList("files", fn)}
                  onError={setError}
                  onShowAll={() => setTab("arquivos")}
                />
                <CommentsCard
                  taskId={task.id}
                  comments={detail.comments}
                  compact
                  userById={userById}
                  onChange={(fn) => setList("comments", fn)}
                  onError={setError}
                />
              </div>
            </div>
          )}
          {tab === "checklist" && (
            <ChecklistCard
              taskId={task.id}
              items={detail.checklist}
              canEdit={canEdit}
              users={users}
              userById={userById}
              onChange={(fn) => setList("checklist", fn)}
              onError={setError}
              onLogged={load}
            />
          )}
          {tab === "comentarios" && (
            <CommentsCard
              taskId={task.id}
              comments={detail.comments}
              userById={userById}
              onChange={(fn) => setList("comments", fn)}
              onError={setError}
            />
          )}
          {tab === "arquivos" && (
            <FilesCard
              taskId={task.id}
              files={detail.files}
              canEdit={canEdit}
              onChange={(fn) => setList("files", fn)}
              onError={setError}
            />
          )}
          {tab === "historico" && <Timeline activity={detail.activity} userById={userById} />}
        </div>
      </div>
    </div>
  );
}

/** Ações do menu ⋮ do painel (sem "Abrir detalhes"). */
function useTaskActionsSafe(task: Task | undefined): MenuEntry[] {
  const placeholder: Task = task ?? {
    id: "",
    title: "",
    status: "todo",
    priority: "media",
    sector: "Executivo",
    assigneeId: "",
    createdById: "",
    createdAt: "",
  };
  const items = useTaskActions(placeholder);
  return items.filter((i, idx) => !(i !== MENU_DIVIDER && i.label === "Abrir detalhes") && !(idx === 1 && i === MENU_DIVIDER));
}

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2 text-[13px] text-[#9A9AA2]">
        <span className="text-[#9A9AA2]">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function AssigneeField({
  task,
  assignee,
  canEdit,
  onChange,
}: {
  task: Task;
  assignee?: User;
  canEdit: boolean;
  onChange: (id: string) => void;
}) {
  const { currentUser, users } = useSession();
  const targets = getAssignableTargets(currentUser, users);
  return (
    <InfoCard icon={<UserRound size={17} />} label="Responsável">
      <Menu
        width={260}
        align="left"
        items={targets.map((u) => ({
          label: `${u.name} · ${u.role}`,
          checked: u.id === task.assigneeId,
          icon: <Avatar initials={u.initials} size={22} />,
          onSelect: () => onChange(u.id),
        }))}
        trigger={({ toggle }) => (
          <button onClick={toggle} disabled={!canEdit} className="flex w-full items-center gap-2.5 text-left disabled:cursor-default">
            <Avatar initials={assignee?.initials ?? "?"} size={38} className="text-[12px]" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-medium text-white">{assignee?.name.split(" ")[0] ?? "—"}</span>
              <span className="block truncate text-[12px] text-[#9A9AA2]">
                {assignee ? `${assignee.role} · ${assignee.sector}` : ""}
              </span>
            </span>
            {canEdit && <ChevronDown size={16} className="shrink-0 text-[#9A9AA2]" />}
          </button>
        )}
      />
    </InfoCard>
  );
}

function SectorField({ task, canEdit, onChange }: { task: Task; canEdit: boolean; onChange: (s: Task["sector"]) => void }) {
  const { currentUser } = useSession();
  const allowed = isGlobalRole(currentUser.role) ? SECTORS : SECTORS.filter((s) => s === directedSector(currentUser));
  const editable = canEdit && allowed.length > 0;
  return (
    <InfoCard icon={<UserRound size={17} />} label="Setor">
      <Menu
        width={200}
        align="left"
        items={allowed.map((s) => ({ label: s, checked: s === task.sector, onSelect: () => onChange(s) }))}
        trigger={({ toggle }) => (
          <button onClick={toggle} disabled={!editable} className="flex items-center gap-2.5 text-[16px] text-white disabled:cursor-default">
            <UsersRound size={22} strokeWidth={1.6} className="text-[#C9C9CF]" />
            {task.sector}
          </button>
        )}
      />
    </InfoCard>
  );
}

function DueField({ task, canEdit, onChange }: { task: Task; canEdit: boolean; onChange: (d: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const tone = dueTone(task.dueDate, task.status === "done");
  return (
    <InfoCard icon={<CalendarDays size={17} />} label="Prazo">
      <div className="relative flex items-center gap-2.5">
        <button
          disabled={!canEdit}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.focus();
          }}
          className="flex items-center gap-2.5 text-left disabled:cursor-default"
        >
          <CalendarDays size={22} strokeWidth={1.6} className="text-[#C9C9CF]" />
          <span className="leading-tight">
            <span className={cn("block text-[15px] font-medium", tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-white")}>
              {task.dueDate ? dueLabel(task.dueDate) : "Sem prazo"}
            </span>
            {task.dueDate && <span className="block text-[13px] text-[#C9C9CF]">{longDate(task.dueDate)}</span>}
          </span>
        </button>
        {canEdit && task.dueDate && (
          <button onClick={() => onChange(null)} className="ml-auto rounded p-0.5 text-muted hover:text-danger" aria-label="Remover prazo">
            <X size={14} />
          </button>
        )}
        <input
          ref={ref}
          type="date"
          tabIndex={-1}
          aria-label="Prazo"
          className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
          value={task.dueDate ?? ""}
          min={undefined}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    </InfoCard>
  );
}

function EditableTitle({ value, disabled, onSave }: { value: string; disabled: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="mt-3 w-full rounded-lg border border-accent/50 bg-transparent px-2 py-1 text-[26px] font-bold tracking-[-0.01em] text-white outline-none"
      />
    );
  }
  return (
    <h2
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "mt-3 text-[26px] font-bold leading-tight tracking-[-0.015em] text-white",
        !disabled && "cursor-text rounded-lg hover:bg-white/[0.03]"
      )}
      title={disabled ? undefined : "Clique para editar"}
    >
      {value}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------------

function Box({ title, right, children, className }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.02] p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[15.5px] font-semibold text-white">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Texto com linhas "- item" viram lista com marcadores. */
function RichText({ text }: { text: string }) {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  text.split("\n").forEach((raw) => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    const bullet = /^\s*[-•*]\s+/.test(line);
    const content = line.replace(/^\s*[-•*]\s+/, "");
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "ul") last.lines.push(content);
      else blocks.push({ type: "ul", lines: [content] });
    } else blocks.push({ type: "p", lines: [content] });
  });
  return (
    <div className="space-y-2.5 text-[14.5px] leading-relaxed text-[#C9C9CF]">
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.lines[0]}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-[#9A9AA2]">
            {b.lines.map((l, j) => <li key={j}>{l}</li>)}
          </ul>
        )
      )}
    </div>
  );
}

function DescriptionCard({ value, canEdit, onSave }: { value: string; canEdit: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Box
      title="Descrição"
      right={
        canEdit && !editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[13px] text-[#9A9AA2] hover:text-white">
            <Pencil size={13} /> Editar
          </button>
        ) : null
      }
    >
      {editing ? (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            placeholder={"Contexto da tarefa…\n- Use \"- \" no início da linha para criar uma lista"}
            className="field resize-y leading-relaxed"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : value.trim() ? (
        <RichText text={value} />
      ) : (
        <button
          disabled={!canEdit}
          onClick={() => setEditing(true)}
          className="text-[14px] text-muted-2 hover:text-muted disabled:cursor-default"
        >
          {canEdit ? "Adicionar descrição…" : "Sem descrição."}
        </button>
      )}
    </Box>
  );
}

function ChecklistCard({
  taskId,
  items,
  canEdit,
  users,
  userById,
  onChange,
  onError,
  onLogged,
}: {
  taskId: string;
  items: ChecklistItem[];
  canEdit: boolean;
  users: User[];
  userById: (id?: string | null) => User | undefined;
  onChange: (fn: (prev: ChecklistItem[]) => ChecklistItem[]) => void;
  onError: (msg: string | null) => void;
  onLogged: () => void;
}) {
  const { replace, tasks } = useTasks();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const done = items.filter((i) => i.done).length;

  // Mantém o contador do card no quadro em dia.
  const syncCounts = (next: ChecklistItem[]) => {
    const t = tasks.find((x) => x.id === taskId);
    if (t) replace({ ...t, checklistTotal: next.length, checklistDone: next.filter((i) => i.done).length });
  };

  async function add() {
    const value = text.trim();
    if (!value) return;
    setText("");
    try {
      onError(null);
      const item = await data.addChecklistItem(taskId, { text: value, dueDate: due || undefined, assigneeId: assigneeId || undefined });
      onChange((prev) => {
        const next = [...prev, item];
        syncCounts(next);
        return next;
      });
      setDue("");
      onLogged();
    } catch (e) {
      setText(value);
      onError(errMsg(e));
    }
  }

  async function toggle(item: ChecklistItem) {
    onChange((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    try {
      const saved = await data.updateChecklistItem(item.id, { done: !item.done });
      onChange((prev) => {
        const next = prev.map((i) => (i.id === saved.id ? saved : i));
        syncCounts(next);
        return next;
      });
    } catch (e) {
      onError(errMsg(e));
      onChange((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
  }

  async function setAssignee(item: ChecklistItem, id: string | null) {
    try {
      const saved = await data.updateChecklistItem(item.id, { assigneeId: id });
      onChange((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
    } catch (e) {
      onError(errMsg(e));
    }
  }

  async function remove(item: ChecklistItem) {
    onChange((prev) => {
      const next = prev.filter((i) => i.id !== item.id);
      syncCounts(next);
      return next;
    });
    await data.deleteChecklistItem(item.id).catch((e) => onError(errMsg(e)));
  }

  return (
    <Box
      title={
        <>
          Checklist <span className="font-normal text-[#9A9AA2]">({done}/{items.length})</span>
        </>
      }
      right={
        canEdit && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[14px] font-medium text-accent hover:brightness-125">
            <Plus size={16} /> Adicionar
          </button>
        )
      }
    >
      {items.length > 0 && (
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
      )}
      <ul className="divide-y divide-white/[0.05]">
        {items.map((item) => {
          const who = userById(item.assigneeId);
          return (
            <li key={item.id} className="group flex items-center gap-3 py-2.5">
              <button
                onClick={() => void toggle(item)}
                disabled={!canEdit}
                className={cn(
                  "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors",
                  item.done ? "border-accent bg-accent text-white" : "border-[#5E5E66] hover:border-accent"
                )}
                aria-label={item.done ? "Desmarcar item" : "Concluir item"}
              >
                {item.done && <CheckIcon />}
              </button>
              <span className={cn("min-w-0 flex-1 text-[14.5px] text-[#D4D4D8]", item.done && "text-[#8E8E96]")}>{item.text}</span>
              {item.dueDate && (
                <span className="shrink-0 font-mono text-[12.5px] text-[#9A9AA2]">
                  {item.dueDate.slice(8, 10)}/{item.dueDate.slice(5, 7)}
                </span>
              )}
              <Menu
                width={230}
                items={[
                  ...users.map((u) => ({
                    label: u.name,
                    checked: u.id === item.assigneeId,
                    icon: <Avatar initials={u.initials} size={20} />,
                    onSelect: () => void setAssignee(item, u.id),
                  })),
                  ...(item.assigneeId ? [MENU_DIVIDER, { label: "Remover responsável", onSelect: () => void setAssignee(item, null) }] : []),
                ]}
                trigger={({ toggle: open }) => (
                  <button onClick={open} disabled={!canEdit} className="shrink-0 disabled:cursor-default" aria-label="Responsável do item">
                    {who ? (
                      <Avatar initials={who.initials} size={28} online={false} className="text-[10px]" />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-white/15 text-muted">
                        <UserRound size={13} />
                      </span>
                    )}
                  </button>
                )}
              />
              {canEdit && (
                <button
                  onClick={() => void remove(item)}
                  className="shrink-0 rounded p-1 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                  aria-label="Excluir item"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {items.length === 0 && !adding && <p className="text-[14px] text-muted-2">Nenhum item ainda.</p>}
      {adding && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Novo item do checklist…"
            className="h-9 w-full bg-transparent px-1 text-[14.5px] text-white outline-none placeholder:text-muted-2"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-md border border-white/10 bg-bg px-2 py-1 text-xs text-content" aria-label="Prazo do item" />
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="rounded-md border border-white/10 bg-bg px-2 py-1 text-xs text-content" aria-label="Responsável do item">
              <option value="">Sem responsável</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setAdding(false)} className="px-2 py-1 text-xs text-muted hover:text-white">Fechar</button>
            <button onClick={() => void add()} className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white">Adicionar</button>
          </div>
        </div>
      )}
    </Box>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagsCard({ tags, canEdit, onSave }: { tags: string[]; canEdit: boolean; onSave: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  function add() {
    const tag = draft.trim();
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) onSave([...tags, tag]);
    setDraft("");
    setAdding(false);
  }
  return (
    <Box title={<><Tag size={17} className="text-[#C9C9CF]" /> Tags</>}>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span key={t} className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[12.5px] text-[#D4D4D8]">
            {t}
            {canEdit && (
              <button onClick={() => onSave(tags.filter((x) => x !== t))} className="hidden text-muted hover:text-danger group-hover:inline" aria-label={`Remover tag ${t}`}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {canEdit &&
          (adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={add}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Nova tag"
              className="w-28 rounded-full border border-accent/50 bg-transparent px-3 py-1 text-[12.5px] text-white outline-none"
            />
          ) : (
            <button onClick={() => setAdding(true)} className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-[#C9C9CF] hover:border-accent/50 hover:text-accent" aria-label="Adicionar tag">
              <Plus size={14} />
            </button>
          ))}
        {!canEdit && tags.length === 0 && <span className="text-[13px] text-muted-2">Sem tags.</span>}
      </div>
    </Box>
  );
}

// ---- Arquivos --------------------------------------------------------------

function toBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function downloadFile(id: string) {
  const f = await data.getFile(id);
  const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: f.mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function FileThumb({ file }: { file: TaskFile }) {
  const [src, setSrc] = useState<string | null>(null);
  const isImage = !file.url && file.mime.startsWith("image/") && file.size < 3 * 1024 * 1024;
  useEffect(() => {
    if (!isImage) return;
    let alive = true;
    data.getFile(file.id).then((f) => alive && setSrc(`data:${f.mime};base64,${f.base64}`)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [file.id, isImage]);
  if (src) return <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />;
  if (file.url) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent/15">
        <Link2 size={20} className="text-accent" />
      </span>
    );
  }
  const pdf = file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-md", pdf ? "bg-[#E5322D]" : "bg-white/[0.07]")}>
      {pdf ? <FileText size={22} className="text-white" /> : <FileIcon size={20} className="text-[#C9C9CF]" />}
    </span>
  );
}

function FilesCard({
  taskId,
  files,
  compact,
  canEdit,
  onChange,
  onError,
  onShowAll,
}: {
  taskId: string;
  files: TaskFile[];
  compact?: boolean;
  canEdit: boolean;
  onChange: (fn: (prev: TaskFile[]) => TaskFile[]) => void;
  onError: (msg: string | null) => void;
  onShowAll?: () => void;
}) {
  const { currentUser } = useSession();
  const { replace, tasks } = useTasks();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  async function addLink() {
    const url = linkUrl.trim();
    if (!url || savingLink) return;
    setSavingLink(true);
    onError(null);
    try {
      const saved = await data.addLink(taskId, url, linkTitle.trim() || undefined);
      onChange((prev) => {
        const next = [...prev, saved];
        syncCount(next.length);
        return next;
      });
      setLinkUrl("");
      setLinkTitle("");
      setLinkOpen(false);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSavingLink(false);
    }
  }

  const syncCount = (count: number) => {
    const t = tasks.find((x) => x.id === taskId);
    if (t) replace({ ...t, fileCount: count });
  };

  async function upload(list: FileList | null) {
    if (!list) return;
    onError(null);
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE) {
        onError(`"${file.name}" passa de 8 MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const saved = await data.uploadFile(taskId, { name: file.name, mime: file.type || "application/octet-stream", base64: await toBase64(file) });
        onChange((prev) => {
          const next = [...prev, saved];
          syncCount(next.length);
          return next;
        });
      } catch (e) {
        onError(errMsg(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function remove(f: TaskFile) {
    if (!window.confirm(`Remover ${f.url ? "o link" : "o anexo"} "${f.name}"?`)) return;
    onChange((prev) => {
      const next = prev.filter((x) => x.id !== f.id);
      syncCount(next.length);
      return next;
    });
    await data.deleteFile(f.id).catch((e) => onError(errMsg(e)));
  }

  const shown = compact ? files.slice(0, 4) : files;

  return (
    <Box
      title={<><Paperclip size={17} className="text-[#C9C9CF]" /> Anexos ({files.length})</>}
      right={
        <span className="flex items-center gap-3">
          <button onClick={() => setLinkOpen((v) => !v)} className="flex items-center gap-1 text-[13px] font-medium text-accent hover:brightness-125">
            <Link2 size={14} /> Link
          </button>
          <button onClick={() => input.current?.click()} className="flex items-center gap-1 text-[13px] font-medium text-accent hover:brightness-125">
            {uploading > 0 ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Enviar
          </button>
        </span>
      }
    >
      <input ref={input} type="file" multiple hidden onChange={(e) => {
        void upload(e.target.files);
        e.target.value = "";
      }} />
      {linkOpen && (
        <div className="mb-3 space-y-2 rounded-lg border border-accent/40 bg-white/[0.02] p-2.5">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addLink();
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="Cole o link (Drive, Figma, Notion, site...)"
            inputMode="url"
            aria-label="Endereço do link"
            className="field h-9 py-1.5 text-[13px]"
          />
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addLink()}
            placeholder="Título (opcional)"
            aria-label="Título do link"
            className="field h-9 py-1.5 text-[13px]"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setLinkOpen(false)} className="px-2 py-1 text-xs text-muted hover:text-white">Cancelar</button>
            <button
              onClick={() => void addLink()}
              disabled={!linkUrl.trim() || savingLink}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {savingLink ? "Salvando…" : "Adicionar link"}
            </button>
          </div>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn("rounded-lg transition-colors", dragOver && "bg-accent/10 outline outline-1 outline-accent/50")}
      >
        {files.length === 0 ? (
          <button
            onClick={() => input.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-white/10 py-5 text-[13px] text-muted hover:border-white/25"
          >
            <Upload size={18} /> Arraste arquivos ou clique para enviar (até 8 MB) — ou use "Link"
          </button>
        ) : (
          <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
            {shown.map((f) => (
              <div key={f.id} className="group relative flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2">
                <button
                  onClick={() =>
                    f.url
                      ? window.open(f.url, "_blank", "noopener,noreferrer")
                      : void downloadFile(f.id).catch((e) => onError(errMsg(e)))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  title={f.url ? `Abrir ${f.url}` : `Baixar ${f.name}`}
                >
                  <FileThumb file={f} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-white">{f.name}</span>
                    <span className="block truncate text-[11.5px] text-[#9A9AA2]">
                      {f.url ? f.url.replace(/^https?:\/\/(www\.)?/i, "") : fileSize(f.size)}
                    </span>
                  </span>
                </button>
                {!compact && (f.url ? <ExternalLink size={14} className="shrink-0 text-muted" /> : <Download size={14} className="shrink-0 text-muted" />)}
                {(canEdit || f.uploaderId === currentUser.id) && (
                  <button
                    onClick={() => void remove(f)}
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full border border-white/10 bg-[#1A1A1D] text-muted hover:text-danger group-hover:grid"
                    aria-label={`Remover ${f.name}`}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {compact && files.length > 4 && (
        <button onClick={onShowAll} className="mt-2 text-[12.5px] text-accent hover:underline">Ver todos os {files.length} arquivos</button>
      )}
    </Box>
  );
}

// ---- Comentários -----------------------------------------------------------

function CommentsCard({
  taskId,
  comments,
  compact,
  userById,
  onChange,
  onError,
}: {
  taskId: string;
  comments: TaskComment[];
  compact?: boolean;
  userById: (id?: string | null) => User | undefined;
  onChange: (fn: (prev: TaskComment[]) => TaskComment[]) => void;
  onError: (msg: string | null) => void;
}) {
  const { currentUser, authUser } = useSession();
  const { replace, tasks } = useTasks();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const shown = useMemo(() => (compact ? comments.slice(-3) : comments), [comments, compact]);

  const syncCount = (count: number) => {
    const t = tasks.find((x) => x.id === taskId);
    if (t) replace({ ...t, commentCount: count });
  };

  async function send() {
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    setBody("");
    try {
      onError(null);
      const c = await data.addComment(taskId, value);
      onChange((prev) => {
        const next = [...prev, c];
        syncCount(next.length);
        return next;
      });
      setTimeout(() => listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" }), 0);
    } catch (e) {
      setBody(value);
      onError(errMsg(e));
    } finally {
      setSending(false);
    }
  }

  async function remove(c: TaskComment) {
    onChange((prev) => {
      const next = prev.filter((x) => x.id !== c.id);
      syncCount(next.length);
      return next;
    });
    await data.deleteComment(c.id).catch((e) => onError(errMsg(e)));
  }

  return (
    <Box title={<><MessageSquare size={17} className="text-[#C9C9CF]" /> Comentários ({comments.length})</>}>
      <ul ref={listRef} className={cn("space-y-4", !compact && "max-h-[50vh] overflow-y-auto pr-1")}>
        {shown.map((c) => {
          const author = userById(c.authorId);
          const mine = c.authorId === authUser.id || isGlobalRole(currentUser.role);
          return (
            <li key={c.id} className="group flex gap-3">
              <Avatar initials={author?.initials ?? "?"} size={36} className="text-[11px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-white">{author?.name.split(" ")[0] ?? "—"}</span>
                  <span className="text-[12px] text-[#9A9AA2]">{relativeTime(c.createdAt)}</span>
                  {mine && (
                    <button onClick={() => void remove(c)} className="ml-auto hidden text-muted hover:text-danger group-hover:block" aria-label="Excluir comentário">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-snug text-[#C9C9CF]">{c.body}</p>
              </div>
            </li>
          );
        })}
        {comments.length === 0 && <li className="text-[13.5px] text-muted-2">Nenhum comentário ainda.</li>}
      </ul>
      <div className="mt-4 flex items-center gap-2.5">
        <Avatar initials={authUser.initials} size={36} className="text-[11px]" />
        <div className="flex flex-1 items-center rounded-xl border border-white/10 bg-white/[0.02] pr-1.5 focus-within:border-accent/50">
          <textarea
            value={body}
            rows={1}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Adicionar um comentário..."
            className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[13.5px] text-white outline-none placeholder:text-[#8E8E96]"
          />
          <button onClick={() => void send()} disabled={!body.trim() || sending} className="rounded-lg p-1.5 text-[#C9C9CF] hover:text-accent disabled:opacity-40" aria-label="Enviar comentário">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={19} />}
          </button>
        </div>
      </div>
    </Box>
  );
}

// ---- Histórico -------------------------------------------------------------

function Timeline({ activity, userById }: { activity: TaskDetail["activity"]; userById: (id?: string | null) => User | undefined }) {
  if (activity.length === 0) return <p className="text-sm text-muted">Sem histórico ainda.</p>;
  return (
    <Box title={<><History size={17} className="text-[#C9C9CF]" /> Histórico</>}>
      <ol className="relative space-y-4 border-l border-white/[0.08] pl-5">
        {activity.map((a) => {
          const actor = userById(a.actorId);
          return (
            <li key={a.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#0E0E10] bg-accent" />
              <div className="text-[14px] text-[#D4D4D8]">
                <span className="font-semibold text-white">{actor?.name ?? "Alguém"}</span> {a.action}
              </div>
              <div className="text-[12px] text-[#8E8E96]">
                {relativeTime(a.createdAt)} · {new Date(a.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </li>
          );
        })}
      </ol>
    </Box>
  );
}
