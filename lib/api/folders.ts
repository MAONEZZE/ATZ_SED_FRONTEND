"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Folder, FolderResourceType } from "@/lib/api/types";

type FolderScope = { resourceType: FolderResourceType; eventId?: string };

function folderPath({ resourceType, eventId }: FolderScope) {
  const params = new URLSearchParams({ resourceType });
  if (eventId) params.set("eventId", eventId);
  return `/folders?${params.toString()}`;
}

function invalidateFolders(queryClient: ReturnType<typeof useQueryClient>) {
  return () => void queryClient.invalidateQueries({ queryKey: ["folders"] });
}

export function useFolders(scope: FolderScope) {
  return useQuery({
    queryKey: queryKeys.folders(scope),
    queryFn: () => api.get<Folder[]>(folderPath(scope)),
  });
}

export function useCreateFolder(scope: FolderScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId = null }: { name: string; parentId?: string | null }) =>
      api.post<Folder>("/folders", { ...scope, name, parentId }),
    onSuccess: invalidateFolders(queryClient),
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Folder>(`/folders/${id}`, { name }),
    onSuccess: invalidateFolders(queryClient),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/folders/${id}`),
    onSuccess: invalidateFolders(queryClient),
  });
}

/** Reordena os irmãos de `parentId` e mantém a árvore otimista até eventual erro. */
export function useReorderFolders(scope: FolderScope) {
  const queryClient = useQueryClient();
  const key = queryKeys.folders(scope);
  return useMutation({
    mutationFn: ({ ids, parentId }: { ids: string[]; parentId: string | null }) =>
      api.patch<void>("/folders/reorder", { ...scope, ids, parentId }),
    onMutate: async ({ ids, parentId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Folder[]>(key);
      if (!previous) return { previous };

      const byId = new Map<string, Folder>();
      const indexFolders = (folders: Folder[]) => {
        for (const folder of folders) {
          byId.set(folder.id, folder);
          indexFolders(folder.children);
        }
      };
      indexFolders(previous);

      const movedIds = new Set(ids);
      const removeMoved = (folders: Folder[]): Folder[] =>
        folders
          .filter((folder) => !movedIds.has(folder.id))
          .map((folder) => ({ ...folder, children: removeMoved(folder.children) }));
      const moved = ids.flatMap((id, order) => {
        const folder = byId.get(id);
        return folder ? [{ ...folder, parentId, order }] : [];
      });
      let next = removeMoved(previous);

      if (parentId === null) {
        next = [...moved, ...next];
      } else {
        let inserted = false;
        const insertIntoParent = (folders: Folder[]): Folder[] =>
          folders.map((folder) => {
            if (folder.id === parentId) {
              inserted = true;
              return { ...folder, children: [...moved, ...folder.children] };
            }
            return { ...folder, children: insertIntoParent(folder.children) };
          });
        const withMoved = insertIntoParent(next);
        if (inserted) next = withMoved;
      }

      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
