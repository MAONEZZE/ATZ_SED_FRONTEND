import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useRegistrations } from "@/lib/api/registrations";

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
