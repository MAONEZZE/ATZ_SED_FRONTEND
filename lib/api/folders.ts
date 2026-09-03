"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Folder, FolderResourceType } from "@/lib/api/types";

type FolderScope = { resourceType: FolderResourceType; eventId?: string };

function folderPath({ resourceType, eventId }: FolderScope) {
  const params = new URLSearchParams({ resourceType });
  const basePath = eventId ? `/events/${eventId}/folders` : "/folders";
  return `${basePath}?${params.toString()}`;
}

function folderMutationPath(scope: FolderScope, suffix = "") {
  const basePath = scope.eventId ? `/events/${scope.eventId}/folders` : "/folders";
  return `${basePath}${suffix}`;
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
      api.post<Folder>(folderMutationPath(scope), {
        resourceType: scope.resourceType,
        name,
        parentId,
      }),
    onSuccess: invalidateFolders(queryClient),
  });
}

export function useRenameFolder(scope: FolderScope = { resourceType: "event" }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Folder>(folderMutationPath(scope, `/${id}`), { name }),
    onSuccess: invalidateFolders(queryClient),
  });
}

export function useDeleteFolder(scope: FolderScope = { resourceType: "event" }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(folderMutationPath(scope, `/${id}`)),
    onSuccess: invalidateFolders(queryClient),
  });
}

/** Reordena os irmãos de `parentId` e mantém a árvore otimista até eventual erro. */
export function useReorderFolders(scope: FolderScope) {
  const queryClient = useQueryClient();
  const key = queryKeys.folders(scope);
  return useMutation({
    mutationFn: ({ ids, parentId }: { ids: string[]; parentId: string | null }) =>
      api.patch<void>(folderMutationPath(scope, "/reorder"), {
        resourceType: scope.resourceType,
        ids,
        parentId,
      }),
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

/**
 * Muda a pasta de nível. `/reorder` só reescreve `order` e ignora id que não é
 * irmão do `parentId` enviado — trocar de pai é `PATCH /folders/:id`, senão o
 * aninhamento só existe no cache e some no próximo carregamento.
 * `siblingIds` (opcional) reordena o destino depois da mudança de nível.
 */
export function useMoveFolder(scope: FolderScope) {
  const queryClient = useQueryClient();
  const key = queryKeys.folders(scope);
  return useMutation({
    mutationFn: async ({
      id,
      parentId,
      siblingIds,
    }: {
      id: string;
      parentId: string | null;
      siblingIds?: string[];
    }) => {
      await api.patch<Folder>(folderMutationPath(scope, `/${id}`), { parentId });
      if (siblingIds?.length) {
        await api.patch<void>(folderMutationPath(scope, "/reorder"), {
          resourceType: scope.resourceType,
          ids: siblingIds,
          parentId,
        });
      }
    },
    onMutate: async ({ id, parentId, siblingIds }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Folder[]>(key);
      const moved = previous && findFolder(previous, id);
      if (!previous || !moved) return { previous };

      const withoutMoved = (folders: Folder[]): Folder[] =>
        folders
          .filter((folder) => folder.id !== id)
          .map((folder) => ({ ...folder, children: withoutMoved(folder.children) }));
      // Sem `siblingIds` o backend joga a pasta no fim dos irmãos do destino.
      // Com eles, só as posições dos irmãos citados são reescritas — quem ficou
      // de fora da lista não muda de lugar.
      const place = (siblings: Folder[]): Folder[] => {
        const next = [...siblings, { ...moved, parentId }];
        if (!siblingIds) return next;
        const ordered = siblingIds.flatMap((siblingId) =>
          next.filter((folder) => folder.id === siblingId),
        );
        let taken = 0;
        return next.map((folder) =>
          siblingIds.includes(folder.id) ? (ordered[taken++] ?? folder) : folder,
        );
      };
      const insert = (folders: Folder[]): Folder[] =>
        folders.map((folder) =>
          folder.id === parentId
            ? { ...folder, children: place(folder.children) }
            : { ...folder, children: insert(folder.children) },
        );

      const rest = withoutMoved(previous);
      queryClient.setQueryData(key, parentId === null ? place(rest) : insert(rest));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

function findFolder(folders: Folder[], id: string): Folder | undefined {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    const found = findFolder(folder.children, id);
    if (found) return found;
  }
  return undefined;
}
