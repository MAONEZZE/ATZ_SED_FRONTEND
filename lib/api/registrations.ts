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
  filters: { status?: FunnelStatus; search?: string; formId?: string } = {},
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", "csv");
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.formId) params.set("formId", filters.formId);
  return apiFetchBlob(`/events/${eventId}/registrations?${params.toString()}`);
}

export function useRegistrations(
  eventId: string,
  params: {
    status?: FunnelStatus;
    search?: string;
    formId?: string;
    page?: number;
    limit?: number;
    enabled?: boolean;
  } = {},
) {
  const { status, search, formId, page = 1, limit = 30, enabled = true } = params;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  if (formId) qs.set("formId", formId);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.registrations(eventId, { status, search, formId, page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<Registration>>(
        `/events/${eventId}/registrations?${qs.toString()}`,
      ),
    enabled: Boolean(eventId) && enabled,
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

export interface ImportRegistrationsPayload {
  formId: string;
  registrations: ImportRegistrationsInput[];
}

export function useImportRegistrations(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, registrations }: ImportRegistrationsPayload) =>
      api.post<ImportRegistrationsResult>(`/events/${eventId}/registrations/import`, {
        formId,
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

export function useDeleteRegistrations(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.delete<{ deleted: number }>(`/events/${eventId}/registrations`, { ids }),
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
