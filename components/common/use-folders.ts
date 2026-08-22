"use client";

import { useCallback, useState } from "react";

export type Folder = { id: string; name: string; count: number };

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const createFolder = useCallback((name: string) => {
    setFolders((prev) => [...prev, { id: generateId(), name, count: 0 }]);
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { folders, createFolder, renameFolder, deleteFolder };
}
