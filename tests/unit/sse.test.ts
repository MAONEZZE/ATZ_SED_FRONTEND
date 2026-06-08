import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeSse } from "@/lib/api/sse";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function mockFetch(chunks: string[], ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    body: streamFromChunks(chunks),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consumeSse", () => {
  it("parseia frames data: e chama onMessage", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(['data: {"chunk":"olá"}\n\n', 'data: {"chunk":"mundo"}\n\n']),
    );
    const messages: string[] = [];
    await consumeSse("/test", { onMessage: (d) => messages.push(d) });
    expect(messages).toEqual(['{"chunk":"olá"}', '{"chunk":"mundo"}']);
  });

  it("frames podem chegar fragmentados entre chunks", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(['data: {"chu', 'nk":"abc"}\n\ndata: {"chunk":"def"}\n\n']),
    );
    const messages: string[] = [];
    await consumeSse("/test", { onMessage: (d) => messages.push(d) });
    expect(messages).toEqual(['{"chunk":"abc"}', '{"chunk":"def"}']);
  });

  it("[DONE] encerra o stream e chama onDone", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch([
        'data: {"chunk":"a"}\n\n',
        "data: [DONE]\n\n",
        'data: {"chunk":"ignorado"}\n\n',
      ]),
    );
    const messages: string[] = [];
    const onDone = vi.fn();
    await consumeSse("/test", { onMessage: (d) => messages.push(d), onDone });
    expect(messages).toEqual(['{"chunk":"a"}']);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("erro HTTP chama onError", async () => {
    vi.stubGlobal("fetch", mockFetch([], false));
    const onError = vi.fn();
    await consumeSse("/test", { onMessage: () => {}, onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toContain("500");
  });

  it("envia Authorization quando há token", async () => {
    const fetchMock = mockFetch(["data: x\n\n"]);
    vi.stubGlobal("fetch", fetchMock);
    await consumeSse("/test", { token: "tok-123", onMessage: () => {} });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
  });
});
