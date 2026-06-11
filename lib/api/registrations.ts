"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FunnelStatus, PaginatedResponse, Registration } from "@/lib/api/types";

/** Baixa o CSV de inscrições (mesmos filtros da listagem) */
export function exportRegistrationsCsv(
  eventId: string,
  filters: { status?: FunnelStatus; search?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();
  return apiFetchBlob(
    `/events/${eventId}/registrations/export${query ? `?${query}` : ""}`,
  );
}

export function useRegistrations(
  eventId: string,
  params: { status?: FunnelStatus; search?: string; page?: number; limit?: number } = {},
) {
  const { status, search, page = 1, limit = 30 } = params;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.registrations(eventId, params),
    queryFn: () =>
      api.get<PaginatedResponse<Registration>>(
        `/events/${eventId}/registrations?${qs.toString()}`,
      ),
    enabled: Boolean(eventId),
  });
}

export function useUpdateRegistration(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, unknown> }) =>
      api.patch<Registration>(`/events/${eventId}/registrations/${id}`, { answers }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "registrations"],
      }),
  });
}

export function useUpdateRegistrationStatus(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FunnelStatus }) =>
      api.patch<Registration>(`/events/${eventId}/registrations/${id}/status`, {
        status,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "registrations"],
      }),
  });
}
