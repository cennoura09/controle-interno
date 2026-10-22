import { useMemo, useState } from "react";
import { UserPlus, ArrowLeft, Lock, Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar, Badge } from "../ui/Badge";
import { useSession } from "../../context/SessionContext";
import {
  canCreateAccounts,
  creatableRoles,
  creatableSectors,
  sectorForRole,
} from "../../lib/permissions";
import type { NewUser, Role, Sector, User } from "../../lib/types";

const SECTOR_ORDER: Sector[] = [
  "Executivo",
  "Marketing",
  "Comercial",
  "Financeiro",
  "Operacional",
];

const ROLE_TITLE: Record<Role, string> = {
  Founder: "Founder",
  CEO: "CEO",
  CMO: "Diretor(a) de Marketing",
  CCO: "Diretor(a) Comercial",
  CFO: "Diretor(a) Financeiro",
  COO: "Diretor(a) de Operações",
  Colaborador: "Colaborador(a)",
};

function roleTone(role: Role): "accent" | "info" | "neutral" {
  if (role === "Founder" || role === "CEO") return "accent";
  if (role === "Colaborador") return "neutral";
  return "info";
}

const fieldCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-content placeholder:text-muted-2 focus-ring";
const labelCls = "mono-label mb-1.5 block";

export function GerenciarEquipeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { currentUser, users, createUser } = useSession();
  const canCreate = canCreateAccounts(currentUser);
  const [mode, setMode] = useState<"list" | "create">("list");

  const groups = useMemo(
    () =>
      SECTOR_ORDER.map((sector) => ({
        sector,
        members: users.filter((u) => u.sector === sector),
      })).filter((g) => g.members.length > 0),
    [users]
  );

  function close() {
    setMode("list");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === "list" ? "Equipe — So Sales" : "Criar conta"}
      description={
        mode === "list"
          ? `${users.length} membros ativos`
          : "Provisione o acesso de um novo membro."
      }
    >
      {mode === "list" ? (
        <>
          {/* Ação de criar conta */}
          <div className="mb-3 flex items-center justify-between">
            <span className="mono-label">MEMBROS</span>
            {canCreate ? (
              <Button
                variant="primary"
                icon={<UserPlus size={15} />}
                onClick={() => setMode("create")}
              >
                Criar conta
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-2">
                <Lock size={12} />
                Apenas diretores e CEO/Founder criam contas
              </span>
            )}
          </div>

          <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.sector}>
                <div className="mono-label mb-1.5">{group.sector}</div>
                <div className="space-y-1">
                  {group.members.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2/50 px-3 py-2"
                    >
                      <Avatar initials={u.initials} size={30} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-sm font-medium">{u.name}</div>
                        <div className="truncate text-[11px] text-muted">{u.title}</div>
                      </div>
                      <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <CriarContaForm
          onCancel={() => setMode("list")}
          onCreate={async (input) => {
            await createUser(input);
            setMode("list");
          }}
          creator={currentUser}
        />
      )}
    </Modal>
  );
}

function CriarContaForm({
  creator,
  onCancel,
  onCreate,
}: {
  creator: User;
  onCancel: () => void;
  onCreate: (input: NewUser) => Promise<void> | void;
}) {
  const roleOptions = creatableRoles(creator);
  const selectableSectors = creatableSectors(creator);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>(roleOptions[0] ?? "Colaborador");
  const [sector, setSector] = useState<Sector>(selectableSectors[0] ?? "Marketing");
  const [submitting, setSubmitting] = useState(false);

  // Para cargos de diretoria/executivo o setor é automático.
  const autoSector = sectorForRole(role);
  const finalSector = autoSector ?? sector;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        role,
        sector: finalSector,
        title: title.trim() || ROLE_TITLE[role],
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">
        <Check size={14} className="mt-0.5 text-accent" />
        <div>
          Criando como <span className="text-content">{creator.name}</span>{" "}
          <Badge tone="accent">{creator.role}</Badge>.{" "}
          {roleOptions.length > 2
            ? "Você pode criar contas em qualquer setor."
            : `Você só cria contas no setor ${selectableSectors[0] ?? "—"} (diretoria ou colaborador).`}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="c-name">Nome completo</label>
        <input
          id="c-name"
          className={fieldCls}
          placeholder="Ex.: Mariana Souza"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="c-role">Função</label>
          <select
            id="c-role"
            className={fieldCls}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r === "Colaborador" ? "Colaborador (funcionário)" : r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="c-sector">Setor</label>
          {autoSector ? (
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-surface-2 px-3 text-sm text-muted">
              {autoSector} <span className="ml-2 text-[11px] text-muted-2">(automático)</span>
            </div>
          ) : selectableSectors.length > 1 ? (
            <select
              id="c-sector"
              className={fieldCls}
              value={sector}
              onChange={(e) => setSector(e.target.value as Sector)}
            >
              {selectableSectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-surface-2 px-3 text-sm text-muted">
              {finalSector} <span className="ml-2 text-[11px] text-muted-2">(seu setor)</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="c-title">Cargo / descrição (opcional)</label>
        <input
          id="c-title"
          className={fieldCls}
          placeholder={ROLE_TITLE[role]}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-content"
        >
          <ArrowLeft size={14} /> Voltar à lista
        </button>
        <Button type="submit" variant="primary" disabled={!name.trim() || submitting}>
          {submitting ? "Criando…" : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}
