"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FunnelStatus, PaginatedResponse, Registration } from "@/lib/api/types";

export function exportRegistrationsCsv(
  eventId: string,
  filters: { status?: FunnelStatus; search?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", "csv");
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return apiFetchBlob(`/events/${eventId}/registrations?${params.toString()}`);
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

    placeholderData: keepPreviousData,
  });
}

export interface ImportRegistrationsInput {
  nome: string;
  telefone?: string;
  email?: string;
}

export interface ImportRegistrationsResult {
  created: number;
  skipped: number;
}

export function useImportRegistrations(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registrations: ImportRegistrationsInput[]) =>
      api.post<ImportRegistrationsResult>(`/events/${eventId}/registrations/import`, {
        registrations,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "registrations"],
      }),
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
