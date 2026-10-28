import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Mostra um check à direita (itens de seleção). */
  checked?: boolean;
}

/** Separador entre grupos de itens. */
export const MENU_DIVIDER = "divider" as const;
export type MenuEntry = MenuItem | typeof MENU_DIVIDER;

/**
 * Menu suspenso ancorado ao gatilho. Fecha ao clicar fora, ao apertar Esc
 * ou ao escolher um item.
 */
export function Menu({
  trigger,
  items,
  align = "right",
  width = 220,
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuEntry[];
  align?: "left" | "right";
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <Popover align={align} width={width}>
          <ul className="py-1" role="menu">
            {items.map((item, i) =>
              item === MENU_DIVIDER ? (
                <li key={`d${i}`} className="my-1 border-t border-border" />
              ) : (
                <li key={item.label}>
                  <button
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      item.danger
                        ? "text-danger hover:bg-danger-soft"
                        : "text-content hover:bg-surface-2"
                    )}
                  >
                    {item.icon && <span className="shrink-0 text-muted">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.checked && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </button>
                </li>
              )
            )}
          </ul>
        </Popover>
      )}
    </div>
  );
}

/** Caixa flutuante padrão (menus, notificações). */
export function Popover({
  children,
  align = "right",
  width = 220,
  className,
  sheetOnMobile = false,
}: {
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
  className?: string;
  /** No celular vira um painel fixo de borda a borda, logo abaixo do cabeçalho. */
  sheetOnMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-2 w-[min(var(--pop-w),calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-[#141416] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]",
        align === "right" ? "right-0" : "left-0",
        sheetOnMobile && "max-sm:fixed max-sm:inset-x-3 max-sm:top-[84px] max-sm:mt-0 max-sm:w-auto max-sm:rounded-2xl",
        className
      )}
      style={{ "--pop-w": `${width}px` } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

/** Fecha um painel controlado ao clicar fora / Esc. */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}
