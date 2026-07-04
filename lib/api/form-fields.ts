"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FieldType, FormField, FormFieldKind, PaginatedResponse } from "@/lib/api/types";

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
    queryKey: queryKeys.formFields(eventId, kind),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "100" });
      if (kind) qs.set("kind", kind);
      const res = await api.get<PaginatedResponse<FormField>>(
        `/events/${eventId}/form-fields?${qs.toString()}`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useCreateFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FormFieldInput) =>
      api.post<FormField>(`/events/${eventId}/form-fields`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "form-fields"] }),
  });
}

export function useUpdateFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormFieldUpdateInput }) =>
      api.patch<FormField>(`/events/${eventId}/form-fields/${id}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "form-fields"] }),
  });
}

export function useDeleteFormField(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${eventId}/form-fields/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "form-fields"] }),
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
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "form-fields"] }),
  });
}
