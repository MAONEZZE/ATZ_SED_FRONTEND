"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FieldType, FormField, PaginatedResponse } from "@/lib/api/types";

export interface FormFieldInput {
  formId: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  order?: number;
}

export type FormFieldUpdateInput = Partial<Omit<FormFieldInput, "formId">>;

export function useFormFields(eventId: string, formId?: string) {
  return useQuery({
    queryKey: queryKeys.formFields(eventId, formId),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "100" });
      if (formId) qs.set("formId", formId);
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

export function useReorderFormFields(eventId: string, formId?: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.formFields(eventId, formId);
  return useMutation({
    mutationFn: async (changes: { id: string; order: number }[]) => {
      await Promise.all(
        changes.map(({ id, order }) =>
          api.patch<FormField>(`/events/${eventId}/form-fields/${id}`, { order }),
        ),
      );
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FormField[]>(key);
      if (previous) {
        const order = new Map(changes.map(({ id, order }) => [id, order]));
        queryClient.setQueryData<FormField[]>(
          key,
          previous.map((f) => (order.has(f.id) ? { ...f, order: order.get(f.id)! } : f)),
        );
      }
      return { previous };
    },
    onError: (_err, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "form-fields"] }),
  });
}
