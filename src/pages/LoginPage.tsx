import { useState, type FormEvent } from "react";
import { Loader2, Mail, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { auth } from "../services";
import { LogoMark } from "../components/ui/Logo";
import orb from "../assets/hero-orb.webp";

const fieldCls =
  "w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-content placeholder:text-muted-2 focus-ring";

/** Traduz os erros mais comuns do Supabase Auth. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha inválidos.";
  if (/email not confirmed/i.test(message)) return "E-mail ainda não confirmado.";
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/signups not allowed|user not found/i.test(message))
    return "Não há conta com este e-mail. Peça acesso a um diretor.";
  return message;
}

/**
 * Tela de acesso — mesma linguagem visual do SoSales (hero escuro com acento
 * laranja à esquerda, formulário de acesso seguro à direita).
 */
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "magic" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth || busy) return;
    setError(null);
    setBusy("password");
    const { error: err } = await auth.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(friendly(err.message));
    setBusy(null);
  }

  async function handleMagicLink() {
    if (!auth || busy) return;
    if (!email.trim()) {
      setError("Informe seu e-mail para receber o link mágico.");
      return;
    }
    setError(null);
    setBusy("magic");
    const { error: err } = await auth.client.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (err) setError(friendly(err.message));
    else setMagicSent(true);
    setBusy(null);
  }

  return (
    <div className="flex min-h-full flex-col bg-bg lg:flex-row">
      {/* Hero */}
      <section className="relative flex min-h-[340px] flex-1 flex-col justify-between overflow-hidden px-6 py-6 sm:px-10 lg:py-10">
        <HeroBackdrop />

        <div className="relative flex items-center gap-3">
          <LogoMark size={44} />
          <span className="font-display text-sm font-bold tracking-[0.18em] text-content">
            SO<span className="text-accent">SALES</span>
          </span>
        </div>

        <div className="relative max-w-xl pb-2 pt-16 lg:pb-8">
          <div className="mono-label mb-4 text-accent">CONTROLE INTERNO · OPERAÇÃO</div>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-content sm:text-5xl">
            Seu time vende melhor
            <br />
            quando tudo está <span className="text-accent">conectado.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm text-muted sm:text-base">
            Tarefas, financeiro e marketing em um só lugar.
          </p>
        </div>
      </section>

      {/* Acesso */}
      <section className="flex w-full items-center justify-center border-t border-border bg-surface/60 px-4 py-10 lg:w-[440px] lg:border-l lg:border-t-0 lg:px-10">
        <div className="w-full max-w-sm">
          <div className="mono-label mb-3 flex items-center gap-1.5 text-accent">
            <ShieldCheck size={13} /> ACESSO SEGURO
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Entre no SoSales</h2>
          <p className="mt-2 text-sm text-muted">
            Acesse com seu e-mail e senha. Se preferir, solicite um link mágico.
          </p>

          {magicSent ? (
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              <div>
                Enviamos um link de acesso para <b>{email.trim()}</b>. Abra o e-mail
                neste dispositivo para entrar.
                <button
                  onClick={() => setMagicSent(false)}
                  className="mt-2 block text-xs text-muted underline hover:text-content"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs text-muted">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className={`${fieldCls} pl-10`}
                    placeholder="voce@suaempresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs text-muted">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className={`${fieldCls} pl-10`}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy !== null || !email.trim() || !password}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-medium text-black shadow-[0_8px_28px_-10px_rgba(255,92,0,0.8)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "password" && <Loader2 size={16} className="animate-spin" />}
                Entrar
              </button>
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={busy !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 py-3 text-sm text-content transition-colors hover:border-muted-2 disabled:opacity-60"
              >
                {busy === "magic" && <Loader2 size={16} className="animate-spin" />}
                Entrar por link mágico
              </button>
            </form>
          )}

          <p className="mt-8 text-[11px] leading-relaxed text-muted-2">
            Ambiente protegido por autenticação e controle de acesso por cargo.
          </p>
        </div>
      </section>
    </div>
  );
}

/** Fundo do hero: o orbe da marca com as ondas de partículas. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <img src={orb} alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_50%] opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
