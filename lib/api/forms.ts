"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Form, FormFieldKind } from "@/lib/api/types";

export interface FormUpdateInput {
  description?: string | null;
  postRegistrationMessage?: string | null;
  linkPostSubscription?: string | null;
}

export function useForm(eventId: string, kind: FormFieldKind) {
  return useQuery({
    queryKey: queryKeys.form(eventId, kind),
    queryFn: () => api.get<Form>(`/events/${eventId}/forms/${kind}`),
    enabled: Boolean(eventId),
  });
}

export function useUpdateForm(eventId: string, kind: FormFieldKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FormUpdateInput) =>
      api.patch<Form>(`/events/${eventId}/forms/${kind}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.form(eventId, kind) }),
  });
}
