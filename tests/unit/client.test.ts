import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, apiFetchBlob, ApiError, setTokenProvider } from "@/lib/api/client";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: () => Promise.resolve(body),
  };
}

describe("apiFetch", () => {
  beforeEach(() => {
    setTokenProvider({
      getAccessToken: vi.fn().mockResolvedValue("token-1"),
      refreshAccessToken: vi.fn().mockResolvedValue("token-2"),
      onUnauthorized: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("injeta Authorization e x-request-id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/events");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/events");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(headers.get("x-request-id")).toBeTruthy();
  });

  it("em 401 faz refresh e repete a requisição", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "evt-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.get<{ id: string }>("/events/evt-1");

    expect(result.id).toBe("evt-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer token-2");
  });

  it("normaliza erro do backend em ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          statusCode: 400,
          message: ["title muito curto", "capacity inválida"],
          requestId: "req-9",
        }),
      ),
    );

    await expect(api.post("/events", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "title muito curto; capacity inválida",
      requestId: "req-9",
    } satisfies Partial<ApiError>);
  });

  it("apiFetchBlob retorna Blob com Authorization injetado", async () => {
    const csv = new Blob(["nome,email\n"], { type: "text/csv" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      blob: () => Promise.resolve(csv),
      json: () => Promise.reject(new Error("não deve parsear JSON")),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetchBlob("/events/evt-1/registrations/export");

    expect(result).toBe(csv);
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("apiFetchBlob normaliza erro em ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { statusCode: 404, message: "Event not found" })),
    );

    await expect(apiFetchBlob("/events/x/registrations/export")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Event not found",
    });
  });

  it("204 retorna undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
        json: () => Promise.reject(new Error("sem corpo")),
      }),
    );
    await expect(api.delete("/events/x")).resolves.toBeUndefined();
  });
});
