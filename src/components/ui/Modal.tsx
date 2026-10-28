import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Celular: folha que sobe de baixo (rolagem interna). Desktop: janela central.
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:overflow-y-auto sm:p-6">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#121214] shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]",
          "animate-[sheet-up_.22s_ease-out] sm:mt-12 sm:max-h-none sm:max-w-lg sm:animate-none sm:overflow-visible sm:rounded-2xl",
          className
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-3 sm:p-5">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-tight text-white sm:text-lg">{title}</h3>
            {description && (
              <p className="mt-1 text-[13px] leading-snug text-muted sm:text-sm">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="focus-ring -mr-1 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-content"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:overflow-visible sm:p-5">
          {children}
        </div>
      </div>
      <style>{`@keyframes sheet-up{from{transform:translateY(40px);opacity:.5}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
