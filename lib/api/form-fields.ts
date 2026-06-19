"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiFetchBlob } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FieldType, FormField, FormFieldKind, PaginatedResponse, PostEventResponse } from "@/lib/api/types";

export interface FormFieldInput {
  label: string;
  type: FieldType;
  kind?: FormFieldKind;
  required?: boolean;
  options?: string[];
  order?: number;
}

export type FormFieldUpdateInput = Omit<Partial<FormFieldInput>, "type">;

export function useFormFields(eventId: string, kind?: FormFieldKind) {
  return useQuery({
    queryKey: queryKeys.formFields(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<FormField>>(
        `/events/${eventId}/form-fields?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
    select: kind ? (data) => data.filter((f) => f.kind === kind) : undefined,
  });
}

export function useCreateFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FormFieldInput) =>
      api.post<FormField>(`/events/${eventId}/form-fields`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.formFields(eventId) }),
  });
}

export function useUpdateFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormFieldUpdateInput }) =>
      api.patch<FormField>(`/events/${eventId}/form-fields/${id}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.formFields(eventId) }),
  });
}

export function useDeleteFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${eventId}/form-fields/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.formFields(eventId) }),
  });
}

export function useReorderFormFields(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: { id: string; order: number }[]) => {
      await Promise.all(
        changes.map(({ id, order }) =>
          api.patch<FormField>(`/events/${eventId}/form-fields/${id}`, { order }),
        ),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.formFields(eventId) }),
  });
}

export function usePostEventResponses(
  eventId: string,
  params: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 20 } = params;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  return useQuery({
    queryKey: queryKeys.postEventResponses(eventId, params),
    queryFn: () =>
      api.get<PaginatedResponse<PostEventResponse>>(
        `/events/${eventId}/post-event-responses?${qs.toString()}`,
      ),
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}

export function exportPostEventResponsesCsv(eventId: string): Promise<Blob> {
  return apiFetchBlob(`/events/${eventId}/post-event-responses/export`);
}
