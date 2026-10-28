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
      {/* Orbe: sangra para fora do conteúdo, por trás do título. No celular
          fica encostado à direita para o "S" não cobrir o título. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[26%] -top-[64px] h-[210px] w-[86%] overflow-hidden opacity-80 sm:-right-4 sm:-top-[100px] sm:h-[330px] sm:w-[78%] sm:opacity-100 lg:-right-10 lg:-top-[110px] lg:h-[360px] lg:w-[72%]"
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
          <div className="font-mono text-[11.5px] font-medium uppercase tracking-[0.22em] text-accent sm:text-[13px] sm:tracking-[0.2em]">
            {eyebrow}
          </div>
          <h1 className="mt-1.5 text-[32px] font-bold leading-[1.08] tracking-[-0.025em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.6)] sm:mt-2 sm:text-[46px] sm:tracking-[-0.02em]">
            {title}
          </h1>
          <div className="mt-2.5 flex items-center gap-3 sm:mt-3 sm:items-start">
            {description && (
              <p className="min-w-0 flex-1 text-[14px] leading-[1.5] text-[#A6A6AE] sm:text-[17px] sm:leading-relaxed">
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
            {action && <div className="shrink-0 sm:hidden">{action}</div>}
          </div>
        </div>
        {action && <div className="relative hidden shrink-0 pt-1 sm:block">{action}</div>}
      </div>
    </div>
  );
}
