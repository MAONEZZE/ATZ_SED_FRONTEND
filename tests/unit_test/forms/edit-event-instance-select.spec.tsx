import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

afterEach(() => cleanup());

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "event-1" }),
}));

vi.mock("@/lib/utils/revalidate-public", () => ({
  revalidatePublicEvent: vi.fn(),
}));

const EVENT = {
  id: "event-1",
  title: "Evento Teste",
  slug: "evento-teste",
  status: "published",
  location: null,
  capacity: null,
  dressCode: null,
  groupLink: null,
  eventDate: "2026-08-01T10:00:00.000Z",
  endDate: "2026-08-01T12:00:00.000Z",
  recurrenceFreq: null,
  recurrenceInterval: null,
  recurrenceUntil: null,
  whatsappInstanceId: "inst-2",
  coverUrl: null,
  updatedAt: "2026-07-16T00:00:00.000Z",
};

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path === "/whatsapp-instances") {
        return Promise.resolve([
          { id: "inst-1", nickname: "Instância Principal", active: true },
          { id: "inst-2", nickname: "Instância Secundária", active: true },
        ]);
      }
      if (path === "/events/event-1") {
        return Promise.resolve(EVENT);
      }
      throw new Error(`unexpected GET ${path}`);
    }),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import EditEventPage from "@/app/(dashboard)/eventos/[id]/edit/page";

// Regressão: quando o evento e a lista de instâncias resolvem no mesmo tick,
// o <Select> do Radix perdia o valor selecionado (bug interno do Radix ao
// registrar as novas <option> depois que o value controlado já mudou).
describe("EditEventPage — seleção de instância", () => {
  it("mantém a instância salva do evento selecionada após o carregamento", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EditEventPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const trigger = screen.getByRole("combobox", { name: /inst/i });
      expect(trigger.textContent).toContain("Instância Secundária");
    });
  });
});
