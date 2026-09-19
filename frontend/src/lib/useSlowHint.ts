import { useEffect, useState } from "react";

/** True once `active` has stayed true for a few seconds — i.e. the server is probably cold-starting. */
export function useSlowHint(active: boolean, afterMs = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active) return;
    const t = setTimeout(() => setSlow(true), afterMs);
    return () => clearTimeout(t);
  }, [active, afterMs]);
  return slow;
}
