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

export function useRenameFolder(scope: FolderScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Folder>(`/folders/${id}`, { name }),
    onSuccess: invalidateFolders(queryClient),
  });
}

export function useDeleteFolder(scope: FolderScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/folders/${id}`),
    onSuccess: invalidateFolders(queryClient),
  });
}

/** Reordena os irmãos de `parentId`. O backend responde 204, então refetch confirma o estado. */
export function useReorderFolders(scope: FolderScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, parentId }: { ids: string[]; parentId: string | null }) =>
      api.patch<void>("/folders/reorder", { ...scope, ids, parentId }),
    onSuccess: invalidateFolders(queryClient),
  });
}
