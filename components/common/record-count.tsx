"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type RecordCountContextValue = {
  count: number | null;
  setCount: (count: number | null) => void;
};

const RecordCountContext = createContext<RecordCountContextValue | null>(null);

export function RecordCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const value = useMemo(() => ({ count, setCount }), [count]);
  return <RecordCountContext.Provider value={value}>{children}</RecordCountContext.Provider>;
}

export function useSetRecordCount(total: number | null) {
  const ctx = useContext(RecordCountContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setCount(total);
    return () => ctx.setCount(null);
  }, [ctx, total]);
}

export function useRecordCount() {
  const ctx = useContext(RecordCountContext);
  return ctx?.count ?? null;
}
