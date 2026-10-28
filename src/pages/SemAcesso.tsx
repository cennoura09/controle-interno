import { ShieldOff, LogOut } from "lucide-react";

/** Login válido, mas a conta não é membro ativo do Controle Interno. */
export function SemAcesso({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldOff size={28} className="text-accent" />
      <div>
        <h1 className="font-display text-xl font-semibold">Sem acesso ao Controle Interno</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Sua conta existe, mas não está ativa nesta equipe. Peça a um diretor ou
          ao admin para liberar seu acesso.
        </p>
      </div>
      <button
        onClick={() => void onSignOut()}
        className="focus-ring flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:border-muted-2"
      >
        <LogOut size={15} /> Sair
      </button>
    </div>
  );
}
