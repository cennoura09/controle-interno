import { useEffect, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Painel lateral (direita) com borda luminosa laranja, como o detalhe de
 * tarefa da referência. No celular ocupa a tela inteira.
 */
export function Drawer({
  open,
  onClose,
  children,
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden bg-[#0E0E10] sm:m-3 sm:h-[calc(100%-1.5rem)] sm:w-[min(820px,calc(100vw-1.5rem))] sm:rounded-2xl",
          "sm:border sm:border-accent/60 sm:shadow-[0_0_0_1px_rgba(255,92,0,0.25),0_0_60px_-10px_rgba(255,92,0,0.55)]",
          "animate-[drawer-in_.22s_ease-out]",
          className
        )}
      >
        {children}
      </aside>
      <style>{`@keyframes drawer-in{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
