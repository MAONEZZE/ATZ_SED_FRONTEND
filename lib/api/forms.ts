"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Form } from "@/lib/api/types";

export interface CreateFormInput {
  name: string;
  description?: string;
  postRegistrationMessage?: string;
  linkPostSubscription?: string;
  requireImageAuthorization?: boolean;
  sendToPipedrive?: boolean;
  anonymous?: boolean;
}

export type FormUpdateInput = Omit<Partial<CreateFormInput>, "anonymous">;

function useInvalidateForms(eventId: string) {
  const queryClient = useQueryClient();
  return (formId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.forms(eventId) });
    if (formId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.form(eventId, formId) });
    }
  };
}

export function useForms(eventId: string) {
  return useQuery({
    queryKey: queryKeys.forms(eventId),
    queryFn: () => api.get<Form[]>(`/events/${eventId}/forms`),
    enabled: Boolean(eventId),
  });
}

export function useFormById(eventId: string, formId: string) {
  return useQuery({
    queryKey: queryKeys.form(eventId, formId),
    queryFn: () => api.get<Form>(`/events/${eventId}/forms/${formId}`),
    enabled: Boolean(eventId) && Boolean(formId),
  });
}

export function useCreateForm(eventId: string) {
  const invalidate = useInvalidateForms(eventId);
  return useMutation({
    mutationFn: (input: CreateFormInput) =>
      api.post<Form>(`/events/${eventId}/forms`, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateForm(eventId: string, formId: string) {
  const invalidate = useInvalidateForms(eventId);
  return useMutation({
    mutationFn: (input: FormUpdateInput) =>
      api.patch<Form>(`/events/${eventId}/forms/${formId}`, input),
    onSuccess: () => invalidate(formId),
  });
}

export function useDeleteForm(eventId: string) {
  const invalidate = useInvalidateForms(eventId);
  return useMutation({
    mutationFn: (formId: string) => api.delete(`/events/${eventId}/forms/${formId}`),
    onSuccess: () => invalidate(),
  });
}

export function useReorderForms(eventId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateForms(eventId);
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.patch<void>(`/events/${eventId}/forms/reorder`, { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.forms(eventId) });
      const previous = queryClient.getQueryData<Form[]>(queryKeys.forms(eventId));
      if (previous) {
        const order = new Map(ids.map((id, index) => [id, index]));
        queryClient.setQueryData<Form[]>(
          queryKeys.forms(eventId),
          previous.map((f) => (order.has(f.id) ? { ...f, order: order.get(f.id)! } : f)),
        );
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.forms(eventId), context.previous);
    },
    onSuccess: () => invalidate(),
  });
}
