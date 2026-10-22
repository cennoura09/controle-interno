import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Atualiza os dados em memória (p/ updates otimistas após uma escrita). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  /** Refaz a busca. */
  reload: () => void;
}

/**
 * Executa uma função assíncrona (normalmente uma chamada ao `data` service)
 * e expõe os estados de carregamento/erro. Cancela atualizações se o
 * componente desmontar ou as dependências mudarem antes de resolver.
 */
export function useAsync<T>(
  factory: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(factory, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    run()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run, nonce]);

  return { data, loading, error, setData, reload };
}
