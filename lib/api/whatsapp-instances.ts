"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { WhatsAppInstance } from "@/lib/api/types";

export function useWhatsAppInstances() {
  return useQuery({
    queryKey: queryKeys.whatsappInstances,
    queryFn: () => api.get<WhatsAppInstance[]>("/whatsapp-instances"),
    select: (instances) =>
      [...instances].sort((a, b) => Number(b.active) - Number(a.active)),
  });
}
