"use client";

import { api } from "@/lib/api/client";
import { consumeSse } from "@/lib/api/sse";
import { authClient } from "@/lib/auth/auth-client";
import type { EmailStyleResponse } from "@/lib/api/types";

export function generateEmailStyles(
  variables: string,
  content?: string,
): Promise<EmailStyleResponse> {
  const body: Record<string, string> = { variables };
  if (content?.trim()) body.content = content;
  return api.post<EmailStyleResponse>("/ai/email-style", body);
}

export async function streamLandingChat(options: {
  message: string;
  landing: unknown;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}): Promise<void> {
  const token = await authClient.getAccessToken();
  await consumeSse("/ai/landing-chat", {
    method: "POST",
    body: { message: options.message, landing: options.landing },
    token,
    signal: options.signal,
    onDone: options.onDone,
    onError: options.onError,
    onMessage: (data) => {
      try {
        const parsed = JSON.parse(data) as { chunk?: string; error?: string };
        if (parsed.error) {
          options.onError?.(new Error(parsed.error));
          return;
        }
        if (parsed.chunk) options.onChunk(parsed.chunk);
      } catch {
        // frame não-JSON: ignora
      }
    },
  });
}
