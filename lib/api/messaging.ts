"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { consumeSse } from "@/lib/api/sse";
import { queryKeys } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth/auth-client";
import type {
  MessageLog,
  SendMessageInput,
  SendMessageResult,
} from "@/lib/api/types";

/** Envio manual (POST /messaging/send) — 202 com resumo queued/skipped */
export function useSendMessage(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      api.post<SendMessageResult>(`/events/${eventId}/messaging/send`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.messageLogs(eventId) }),
  });
}

export function useMessageLogs(eventId: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.messageLogs(eventId),
    queryFn: () =>
      api.get<MessageLog[]>(`/events/${eventId}/messaging/logs?limit=${limit}`),
    enabled: Boolean(eventId),
  });
}

/**
 * Stream ao vivo dos logs via SSE (fetch-stream — EventSource não envia
 * Authorization header). Backend emite a cada 3s os 20 logs mais recentes.
 * Reconecta com backoff em caso de queda.
 */
export function useMessageLogsStream(eventId: string) {
  const [liveLogs, setLiveLogs] = useState<MessageLog[] | null>(null);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    let stopped = false;

    async function connect() {
      while (!stopped) {
        const token = await authClient.getAccessToken();
        if (!token) return;

        setConnected(true);
        await consumeSse(`/events/${eventId}/messaging/logs/stream`, {
          token,
          signal: controller.signal,
          onMessage: (data) => {
            retryRef.current = 0;
            try {
              const parsed = JSON.parse(data) as MessageLog[] | MessageLog;
              setLiveLogs(Array.isArray(parsed) ? parsed : [parsed]);
            } catch {
              // frame não-JSON: ignora
            }
          },
        });
        setConnected(false);

        if (stopped || controller.signal.aborted) return;
        // backoff exponencial até 30s
        const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
        retryRef.current += 1;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    void connect();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [eventId]);

  return { liveLogs, connected };
}
