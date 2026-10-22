import { Loader2, AlertTriangle } from "lucide-react";

/** Indicador de carregamento inline (dentro de uma seção/página). */
export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted">
      <Loader2 size={18} className="animate-spin text-accent" />
      {label}
    </div>
  );
}

/** Carregamento em tela cheia (boot do app). */
export function FullScreenLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2.5 text-sm text-muted">
      <Loader2 size={20} className="animate-spin text-accent" />
      {label}
    </div>
  );
}

/** Estado de erro de carregamento, com ação de tentar novamente. */
export function LoadError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle size={22} className="text-danger" />
      <div className="text-sm text-muted">
        Não foi possível carregar os dados.
        <span className="mt-1 block font-mono text-[11px] text-muted-2">
          {error.message}
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-content hover:border-muted-2"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
