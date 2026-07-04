"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { SendMessageInput, SendMessageResult } from "@/lib/api/types";

export function useSendMessage(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      api.post<SendMessageResult>(`/messages`, { eventId, ...input }),
    onSuccess: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.messageLogs(eventId) });
      }
    },
  });
}
