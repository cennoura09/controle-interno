import logo from "../../assets/logo-s.png";
import { cn } from "../../lib/cn";

/** Marca So Sales: o "S" no círculo laranja → preto. */
export function LogoMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="So Sales"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full shadow-[0_0_28px_-4px_rgba(255,92,0,0.55)]", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Logo + "So Sales / OPERAÇÃO". */
export function Brand({ size = 48, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[19px] font-semibold tracking-tight text-white">So Sales</div>
          <div className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-accent">
            Operação
          </div>
        </div>
      )}
    </div>
  );
}
