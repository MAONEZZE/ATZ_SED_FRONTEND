"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { MessageChannel, MessageTemplate, PaginatedResponse } from "@/lib/api/types";

export interface TemplateInput {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
}

export const TEMPLATE_VARIABLES = [
  "nome",
  "email",
  "telefone",
  "evento",
  "data",
  "local",
  "capacidade",
  "dress_code",
  "link_grupo",
  "invite",
  "invite_recorrente",
] as const;

export function useTemplates(eventId: string) {
  return useQuery({
    queryKey: queryKeys.templates(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MessageTemplate>>(
        `/events/${eventId}/templates?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}
