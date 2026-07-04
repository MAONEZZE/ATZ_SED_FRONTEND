"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { MessageChannel, MessageTemplate, PaginatedResponse } from "@/lib/api/types";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";

export interface TemplateInput {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  layoutConfig?: EmailLayoutConfig | null;
  styleKey?: EmailTemplateKey | null;
  /** Vincula o template a um evento. null = global (sem evento). */
  eventId?: string | null;
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
