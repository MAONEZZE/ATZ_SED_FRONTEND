"use client";

import { useEffect, useState } from "react";
import { getDraft, setDraft } from "@/lib/utils/local-draft";

const STORAGE_KEY = "sidebar-collapsed";

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getDraft<boolean>(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored);
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      setDraft(STORAGE_KEY, next);
      return next;
    });
  }

  return { collapsed, toggle, mounted };
}
