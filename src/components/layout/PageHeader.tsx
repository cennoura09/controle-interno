import type { ReactNode } from "react";
import orb from "../../assets/hero-orb.webp";

/**
 * Cabeçalho de página da operação: rótulo "OPERAÇÃO", título grande,
 * descrição e o orbe laranja com o "S" ao fundo, à direita.
 * No celular a ação fica ao lado da descrição; no desktop, no topo à direita.
 */
export function PageHeader({
  title,
  description,
  shortDescription,
  action,
  eyebrow = "Operação",
}: {
  title: string;
  description?: string;
  /** Versão curta para o celular (opcional). */
  shortDescription?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="relative">
      {/* Orbe: sangra para fora do conteúdo, por trás do título. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-[76px] h-[250px] w-[78%] overflow-hidden sm:-top-[100px] sm:h-[330px] lg:-right-10 lg:-top-[110px] lg:h-[360px] lg:w-[72%]"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 38%, black 100%), linear-gradient(to bottom, black 55%, transparent 100%)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 38%, black 100%), linear-gradient(to bottom, black 55%, transparent 100%)",
          WebkitMaskComposite: "source-in",
        }}
      >
        <img src={orb} alt="" className="h-full w-full object-cover object-[78%_45%] opacity-95" />
      </div>

      <div className="relative flex items-start justify-between gap-5">
        <div className="min-w-0 max-w-[720px] flex-1">
          <div className="font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-accent">{eyebrow}</div>
          <h1 className="mt-2 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-[46px]">
            {title}
          </h1>
          <div className="mt-3 flex items-start gap-3">
            {description && (
              <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-[#A6A6AE] sm:text-[17px]">
                {shortDescription ? (
                  <>
                    <span className="sm:hidden">{shortDescription}</span>
                    <span className="hidden sm:inline">{description}</span>
                  </>
                ) : (
                  description
                )}
              </p>
            )}
            {action && <div className="shrink-0 pt-1 sm:hidden">{action}</div>}
          </div>
        </div>
        {action && <div className="relative hidden shrink-0 pt-1 sm:block">{action}</div>}
      </div>
    </div>
  );
}
