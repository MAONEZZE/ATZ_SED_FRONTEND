import { env } from "@/lib/env";

export interface SseOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  onMessage: (data: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export async function consumeSse(path: string, options: SseOptions): Promise<void> {
  const { method = "GET", body, token, signal, onMessage, onError, onDone } = options;

  try {
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE falhou: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            onDone?.();
            return;
          }
          if (data) onMessage(data);
        }
      }
    }
    onDone?.();
  } catch (error) {
    if (signal?.aborted) return;
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
