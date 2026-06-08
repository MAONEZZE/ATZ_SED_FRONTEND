"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FieldType, FormField } from "@/lib/api/types";

export interface FormFieldInput {
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  order?: number;
}

/** type não pode ser alterado após criação (contrato) */
export type FormFieldUpdateInput = Omit<Partial<FormFieldInput>, "type">;

export function useFormFields(eventId: string) {
  return useQuery({
    queryKey: queryKeys.formFields(eventId),
    queryFn: () => api.get<FormField[]>(`/events/${eventId}/form-fields`),
    enabled: Boolean(eventId),
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

/** Reordenação: contrato não tem batch — PATCH `order` por campo alterado */
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
