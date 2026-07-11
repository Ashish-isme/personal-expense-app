import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Small data-fetching hook with loading/error state and a manual reload.
 * Re-fetches whenever `path` changes.
 */
export function useFetch<T>(path: string): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((d) => active && setData(d))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => load(), [load]);

  return { data, loading, error, reload: load };
}
