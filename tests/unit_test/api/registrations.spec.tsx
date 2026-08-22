import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useRegistrations,
  exportRegistrationsCsv,
  useImportRegistrations,
} from "@/lib/api/registrations";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "200",
    headers: new Headers(),
    json: () => Promise.resolve(body),
  };
}

describe("useRegistrations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("inclui formId na query string quando informado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(
      () => useRegistrations("evt-1", { formId: "form-9", limit: 30 }),
      { wrapper },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/events/evt-1/registrations?");
    expect(url).toContain("formId=form-9");
  });

  it("não inclui formId quando ausente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useRegistrations("evt-1", { limit: 30 }), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("formId");
  });
});

describe("exportRegistrationsCsv", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("inclui formId na query string do export quando informado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "200",
      headers: new Headers(),
      blob: () => Promise.resolve(new Blob()),
    });
    vi.stubGlobal("fetch", fetchMock);

    await exportRegistrationsCsv("evt-1", { formId: "form-9" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("formId=form-9");
  });
});

describe("useImportRegistrations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("manda formId junto com registrations no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "201",
      headers: new Headers(),
      json: () => Promise.resolve({ created: 1, skipped: 0 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useImportRegistrations("evt-1"), { wrapper });

    await act(async () => {
      result.current.mutate({
        formId: "form-9",
        registrations: [{ nome: "Ana", telefone: "+5511999998888" }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      formId: "form-9",
      registrations: [{ nome: "Ana", telefone: "+5511999998888" }],
    });
  });
});
