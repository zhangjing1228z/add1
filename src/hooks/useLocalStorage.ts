import { useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initial: T,
  migrate?: (raw: unknown) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return migrate ? migrate(parsed) : (parsed as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 儲存空間不可用時忽略 */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
