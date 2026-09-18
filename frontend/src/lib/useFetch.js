/**
 * Small data-fetching hook shared by every dashboard page: calls
 * `fetchFn()` whenever `deps` changes, and exposes { data, loading,
 * error, refetch } so components can render loading/error states
 * consistently instead of each page reinventing this.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (currentRequest === requestId.current) setData(result);
      })
      .catch((err) => {
        if (currentRequest === requestId.current) setError(err.message || 'Something went wrong.');
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return { data, loading, error, refetch: load };
}
