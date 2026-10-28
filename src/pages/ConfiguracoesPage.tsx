import { useEffect, useState } from "react";
import { UserRound, ShieldCheck, UsersRound, Gauge, SlidersHorizontal, CheckCircle2, Crown } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Avatar, Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EquipePanel } from "../components/equipe/GerenciarEquipeModal";
import { useSession } from "../context/SessionContext";
import { useUI } from "../context/UIContext";
import { auth, data } from "../services";
import { canRegisterFinance, assignmentScopeLabel } from "../lib/permissions";
import { cn } from "../lib/cn";

type Section = "perfil" | "seguranca" | "equipe" | "indicadores" | "preferencias";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ConfiguracoesPage() {
  const { currentUser, hasAuth } = useSession();
  const [section, setSection] = useState<Section>("perfil");

  const sections: { id: Section; label: string; icon: typeof UserRound; show: boolean }[] = [
    { id: "perfil", label: "Perfil", icon: UserRound, show: true },
    { id: "seguranca", label: "Segurança", icon: ShieldCheck, show: hasAuth },
    { id: "equipe", label: "Equipe", icon: UsersRound, show: true },
    { id: "indicadores", label: "Indicadores", icon: Gauge, show: canRegisterFinance(currentUser) },
    { id: "preferencias", label: "Preferências", icon: SlidersHorizontal, show: true },
  ];

  return (
    <div className="space-y-7">
      <PageHeader title="Configurações" description="Seu perfil, segurança da conta, equipe e preferências do painel." shortDescription="Perfil, segurança e equipe." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:flex-col">
          {sections.filter((s) => s.show).map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition-colors sm:gap-3 sm:px-4 sm:py-3 sm:text-[15px]",
                section === s.id
                  ? "border-accent/45 bg-accent/10 text-white"
                  : "border-transparent text-[#C9C9CF] hover:bg-white/[0.04]"
              )}
            >
              <s.icon size={18} className={section === s.id ? "text-accent" : "text-[#9A9AA2]"} />
              {s.label}
            </button>
          ))}
        </nav>
        <div>
          {section === "perfil" && <PerfilSection />}
          {section === "seguranca" && <SegurancaSection />}
          {section === "equipe" && (
            <Card>
              <EquipePanel />
            </Card>
          )}
          {section === "indicadores" && <IndicadoresSection />}
          {section === "preferencias" && <PreferenciasSection />}
        </div>
      </div>
    </div>
  );
}

function Saved({ text = "Salvo" }: { text?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-success">
      <CheckCircle2 size={15} /> {text}
    </span>
  );
}

function PerfilSection() {
  const { authUser, replaceUser } = useSession();
  const [name, setName] = useState(authUser.name);
  const [title, setTitle] = useState(authUser.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      replaceUser(await data.updateProfile(name.trim(), title.trim()));
      setSaved(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar initials={authUser.initials} size={56} className="text-lg sm:h-16 sm:w-16" />
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white sm:text-xl">
            {authUser.name}
            {authUser.isSuperAdmin && <Crown size={17} className="text-accent" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{authUser.role}</Badge>
            <Badge>{authUser.sector}</Badge>
            {authUser.isSuperAdmin && <Badge tone="accent">Admin supremo</Badge>}
          </div>
        </div>
      </div>
      <form onSubmit={save} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mono-label mb-1.5 block" htmlFor="pf-name">Nome</label>
          <input id="pf-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mono-label mb-1.5 block" htmlFor="pf-title">Cargo / descrição</label>
          <input id="pf-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mono-label mb-1.5 block">E-mail de login</label>
          <div className="field cursor-default text-muted">{authUser.email ?? "—"}</div>
        </div>
        <div>
          <label className="mono-label mb-1.5 block">Pode atribuir tarefas para</label>
          <div className="field cursor-default text-muted">{assignmentScopeLabel(authUser)}</div>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{busy ? "Salvando…" : "Salvar perfil"}</Button>
          {saved && <Saved />}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </form>
      <p className="mt-4 text-xs text-muted-2">Função e setor são definidos por um diretor ou CEO/Founder.</p>
    </Card>
  );
}

function SegurancaSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");
    if (!auth) return;
    setBusy(true);
    const { error: err } = await auth.client.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else {
      setSaved(true);
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">Alterar senha</h2>
      <p className="mt-1 text-sm text-muted">Use pelo menos 8 caracteres. Você continua conectado neste dispositivo.</p>
      <form onSubmit={save} className="mt-5 grid max-w-md grid-cols-1 gap-4">
        <div>
          <label className="mono-label mb-1.5 block" htmlFor="pw-new">Nova senha</label>
          <input id="pw-new" type="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="mono-label mb-1.5 block" htmlFor="pw-confirm">Confirmar nova senha</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Salvando…" : "Alterar senha"}</Button>
          {saved && <Saved text="Senha alterada" />}
        </div>
        {error && <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
      </form>
    </Card>
  );
}

function IndicadoresSection() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    data.getSettings().then((s) => setValue(((s.inadimplencia ?? 0) * 100).toFixed(1).replace(".", ","))).catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value.replace(",", ".").replace("%", ""));
    if (Number.isNaN(n) || n < 0 || n > 100) return setError("Informe um percentual entre 0 e 100.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await data.setSetting("inadimplencia", n / 100);
      setSaved(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">Indicadores financeiros</h2>
      <p className="mt-1 text-sm text-muted">Valores que ainda não vêm do gateway e aparecem no painel Financeiro.</p>
      <form onSubmit={save} className="mt-5 flex max-w-md items-end gap-3">
        <div className="flex-1">
          <label className="mono-label mb-1.5 block" htmlFor="ind-inad">Inadimplência (%)</label>
          <input id="ind-inad" className="field" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
        </div>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
      </form>
      <div className="mt-3 min-h-5">
        {saved && <Saved />}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </Card>
  );
}

function PreferenciasSection() {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">Preferências</h2>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3.5">
        <div>
          <div className="text-[15px] text-white">Menu lateral recolhido</div>
          <div className="text-[13px] text-muted">Mostra só os ícones no desktop. Também dá para usar a seta ao lado do logo.</div>
        </div>
        <button
          role="switch"
          aria-checked={sidebarCollapsed}
          onClick={toggleSidebar}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", sidebarCollapsed ? "bg-accent" : "bg-white/15")}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", sidebarCollapsed ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3.5">
        <div>
          <div className="text-[15px] text-white">Atalho de busca</div>
          <div className="text-[13px] text-muted">Ctrl + K (ou ⌘ + K no Mac) abre a busca de tarefas, pessoas e setores.</div>
        </div>
      </div>
    </Card>
  );
}
