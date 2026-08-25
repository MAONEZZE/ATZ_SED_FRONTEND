"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useFolders } from "@/lib/api/folders";
import type {
  EventObject,
  EventStatus,
  Folder,
  PaginatedResponse,
  RecurrenceFreq,
} from "@/lib/api/types";

export interface EventInput {
  title: string;
  location?: string;
  capacity?: number;
  dressCode?: string;
  groupLink?: string;
  eventDate?: string;
  endDate?: string;
  recurrenceFreq?: RecurrenceFreq | null;
  recurrenceInterval?: number | null;
  recurrenceUntil?: string | null;
  whatsappInstanceId?: string;
  whatsappToken?: string;
  folderId?: string | null;
}

export type EventUpdateInput = Partial<EventInput>;

export function eventsListPath(
  page: number,
  limit: number,
  folderId?: string | null,
): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  // A raiz é representada pela ausência do filtro. O literal `folderId=null`
  // não faz parte do contrato da API em uso e é rejeitado pelo backend.
  if (folderId) params.set("folderId", folderId);
  return `/events?${params.toString()}`;
}

export function useEvents(page = 1, limit = 20, folderId?: string | null) {
  return useQuery({
    queryKey: queryKeys.events({ page, limit, folderId }),
    queryFn: () =>
      api.get<PaginatedResponse<EventObject>>(eventsListPath(page, limit, folderId)),
    // limit 0 = a lista ainda não mediu quantas linhas cabem na tela.
    enabled: limit > 0,
  });
}

const EVENTS_FOLDER_FETCH_LIMIT = 100;

export async function fetchEventsByFolder(
  page: number,
  limit: number,
  folderId: string | null,
  myFolderIds: ReadonlySet<string> = new Set(),
): Promise<PaginatedResponse<EventObject>> {
  // A API implantada rejeita `folderId` na query de GET /events. Carregamos as
  // páginas sem esse parâmetro e aplicamos o escopo no cliente até o DTO do
  // backend aceitar o filtro que o controller já implementa.
  const first = await api.get<PaginatedResponse<EventObject>>(
    eventsListPath(1, EVENTS_FOLDER_FETCH_LIMIT),
  );
  const pageCount = Math.ceil(first.total / EVENTS_FOLDER_FETCH_LIMIT);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      api.get<PaginatedResponse<EventObject>>(
        eventsListPath(index + 2, EVENTS_FOLDER_FETCH_LIMIT),
      ),
    ),
  );
  const scoped = [first, ...remaining]
    .flatMap((response) => response.data)
    .filter((event) => {
      const effectiveFolderId =
        event.folderId && myFolderIds.has(event.folderId) ? event.folderId : null;
      return effectiveFolderId === folderId;
    });
  const offset = (page - 1) * limit;

  return {
    data: scoped.slice(offset, offset + limit),
    total: scoped.length,
    page,
    limit,
  };
}

/** Lista paginada de uma pasta sem serializar `folderId` na query da API. */
export function useEventsByFolder(page: number, limit: number, folderId: string | null) {
  const { data: folderTree = [], isSuccess: foldersLoaded } = useFolders({
    resourceType: "event",
  });
  const folderIds = flattenFolders(folderTree)
    .map((folder) => folder.id)
    .sort();
  const myFolderIds = new Set(folderIds);

  return useQuery({
    queryKey: queryKeys.events({ page, limit, folderId, folderIds }),
    queryFn: () => fetchEventsByFolder(page, limit, folderId, myFolderIds),
    enabled: limit > 0 && foldersLoaded,
  });
}

function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])]);
}

export function useEvent(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => api.get<EventObject>(`/events/${id}`),
    enabled: Boolean(id),
    // Abre instantâneo: usa o evento já presente em qualquer lista cacheada como
    // dado inicial; refaz em background (updatedAt 0 = stale) para garantir dados
    // completos/atualizados.
    initialData: () => {
      const lists = queryClient.getQueriesData<PaginatedResponse<EventObject>>({
        queryKey: ["events"],
      });
      for (const [, data] of lists) {
        const list = data?.data;
        if (Array.isArray(list)) {
          const found = list.find((e) => e.id === id);
          if (found) return found;
        }
      }
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: EventInput) => api.post<EventObject>("/events", input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: EventUpdateInput) =>
      api.patch<EventObject>(`/events/${id}`, input),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateEventStatus(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (status: EventStatus) =>
      api.patch<EventObject>(`/events/${id}/status`, { status }),
    onSuccess: () => invalidate(id),
  });
}

export function useUploadEventCover(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<EventObject>(`/events/${id}/cover`, formData);
    },
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteEventCover(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: () => api.delete<EventObject>(`/events/${id}/cover`),
    onSuccess: () => invalidate(id),
  });
}

export function useCancelEvent(id: string) {
  const invalidate = useInvalidateEvents();
  // Cancelamento é uma transição de status com efeito colateral (notificação):
  // o backend não expõe POST /cancel, e sim PATCH /status com status=cancelled.
  return useMutation({
    mutationFn: (notifyParticipants: boolean) =>
      api.patch<EventObject>(`/events/${id}/status`, {
        status: "cancelled",
        notifyParticipants,
      }),
    onSuccess: () => invalidate(id),
  });
}

export function useDuplicateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: string) => api.post<EventObject>(`/events/${id}/duplicate`),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => invalidate(),
  });
}

/**
 * Reordena um evento dentro da pasta atual ou o move para outra pasta.
 * O endpoint `/move` aceita somente `beforeId`; a pasta é alterada no endpoint
 * principal do evento.
 */
export function useMoveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      folderId,
      beforeId,
    }: {
      id: string;
      folderId?: string | null;
      beforeId?: string;
    }) => {
      if (folderId !== undefined) {
        return api
          .patch<EventObject>(`/events/${id}`, { folderId })
          .then(() => undefined);
      }
      return api.patch<void>(`/events/${id}/move`, {
        ...(beforeId ? { beforeId } : {}),
      });
    },
    onMutate: async ({ id, folderId, beforeId }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueriesData<PaginatedResponse<EventObject>>({
        queryKey: ["events"],
      });
      const moved = previous
        .flatMap(([, data]) => data?.data ?? [])
        .find((event) => event.id === id);
      if (!moved) return { previous };

      const targetFolderId = folderId === undefined ? moved.folderId : folderId;
      for (const [key, data] of previous) {
        if (!data || !Array.isArray(data.data)) continue;
        const params = Array.isArray(key)
          ? (key[1] as { folderId?: string | null; folderIds?: string[] } | undefined)
          : undefined;
        if (params?.folderId === undefined) {
          queryClient.setQueryData<PaginatedResponse<EventObject>>(key, {
            ...data,
            data: data.data.map((event) =>
              event.id === id ? { ...event, folderId: targetFolderId } : event,
            ),
          });
          continue;
        }
        const effectiveTargetFolderId =
          folderId === undefined && params.folderIds
            ? targetFolderId && params.folderIds.includes(targetFolderId)
              ? targetFolderId
              : null
            : targetFolderId;
        const isTarget = params.folderId === effectiveTargetFolderId;
        let next = data.data.filter((event) => event.id !== id);
        if (isTarget) {
          const nextMoved = { ...moved, folderId: targetFolderId };
          const insertAt = beforeId
            ? next.findIndex((event) => event.id === beforeId)
            : -1;
          next =
            insertAt >= 0
              ? [...next.slice(0, insertAt), nextMoved, ...next.slice(insertAt)]
              : [...next, nextMoved];
        }
        queryClient.setQueryData<PaginatedResponse<EventObject>>(key, {
          ...data,
          data: next,
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
