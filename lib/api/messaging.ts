"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MessageAttachment,
  SendMessageInput,
  SendMessageResult,
} from "@/lib/api/types";

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

/** Sobe um anexo (multipart) e devolve a referência pronta para o envio. */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<MessageAttachment>(`/messages/attachments`, formData);
    },
  });
}
