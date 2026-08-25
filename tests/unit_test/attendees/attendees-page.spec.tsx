import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecordCountProvider, useRecordCount } from "@/components/common/record-count";

beforeAll(() => {
  // jsdom não implementa ResizeObserver; a DataTable usa um pra remedir no resize.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom não implementa esses APIs usados pelo Radix Select ao abrir/focar itens.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "evt-1" }),
}));

const FORMS = [
  { id: "form-1", eventId: "evt-1", name: "Inscrição", slug: "inscricao", order: 0, description: null, postRegistrationMessage: null, linkPostSubscription: null, requireImageAuthorization: false, sendToPipedrive: false, anonymous: false, createdAt: "", updatedAt: "" },
  { id: "form-2", eventId: "evt-1", name: "Pesquisa", slug: "pesquisa", order: 1, description: null, postRegistrationMessage: null, linkPostSubscription: null, requireImageAuthorization: false, sendToPipedrive: false, anonymous: true, createdAt: "", updatedAt: "" },
];

const REGISTRATIONS = [
  { id: "r1", eventId: "evt-1", status: "approved", name: "Ana", email: "ana@x.com", phone: "+5511999998888", answers: {}, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "", formName: "Inscrição", attended: true },
  { id: "r2", eventId: "evt-1", status: "pending", name: "Bruno", email: "bruno@x.com", phone: "+5511999997777", answers: {}, createdAt: "2026-08-02T00:00:00.000Z", updatedAt: "", formName: "Inscrição", attended: false },
];

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path.startsWith("/events/evt-1/forms")) return Promise.resolve(FORMS);
      if (path.startsWith("/events/evt-1/registrations")) {
        return Promise.resolve({ data: REGISTRATIONS, total: REGISTRATIONS.length });
      }
      if (path.startsWith("/events/evt-1/form-responses")) {
        return Promise.resolve({ data: [], total: 3 });
      }
      if (path.startsWith("/events/evt-1/form-fields")) {
        return Promise.resolve({ data: [], total: 0 });
      }
      throw new Error(`unexpected GET ${path}`);
    }),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiFetchBlob: vi.fn().mockResolvedValue(new Blob()),
}));

import { api } from "@/lib/api/client";
import AttendeesPage from "@/app/(dashboard)/events/[id]/attendees/page";

function RecordCountProbe() {
  const count = useRecordCount();
  return <div data-testid="record-count">{String(count)}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecordCountProvider>
        <AttendeesPage />
        <RecordCountProbe />
      </RecordCountProvider>
    </QueryClientProvider>,
  );
}

function openSelectAndPick(optionName: string) {
  const trigger = screen.getByRole("combobox", { name: "Formulário" });
  fireEvent.click(trigger);
  return screen.findByRole("option", { name: optionName }).then((option) => {
    fireEvent.click(option);
  });
}

describe("AttendeesPage — seletor de formulário", () => {
  it("mostra coluna Formulário no Geral e desabilita Importar", async () => {
    renderPage();

    await screen.findByText("Ana");
    expect(screen.getByText("Formulário")).not.toBeNull();
    // "Inscrição" aparece 2x: nome do form (coluna Formulário) e cabeçalho da coluna de data.
    expect(screen.getAllByText("Inscrição").length).toBeGreaterThanOrEqual(2);

    const importButton = screen.getByRole("button", { name: /importar csv/i }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
  });

  it("filtra por formId e some a coluna Formulário ao selecionar form não-anônimo", async () => {
    renderPage();
    await screen.findByText("Ana");

    await openSelectAndPick("Inscrição");

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((url: string) => url.includes("/events/evt-1/registrations") && url.includes("formId=form-1"))).toBe(true);
    });
    expect(screen.queryByText("Formulário")).toBeNull();
    const importButton = screen.getByRole("button", { name: /importar csv/i }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(false);
  });

  it("mostra a tabela de respostas anônimas com Importar desabilitado e formulário após Exportar", async () => {
    renderPage();
    await screen.findByText("Ana");

    await openSelectAndPick("Pesquisa");

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((url: string) => url.includes("/events/evt-1/form-responses") && url.includes("formId=form-2"))).toBe(true);
    });
    const importButton = screen.getByRole("button", {
      name: /importar csv/i,
    }) as HTMLButtonElement;
    const exportButton = screen.getByRole("button", { name: /exportar csv/i });
    const formSelect = screen.getByRole("combobox", { name: "Formulário" });
    expect(importButton.disabled).toBe(true);
    expect(
      exportButton.compareDocumentPosition(formSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("AttendeesPage — coluna Checkin", () => {
  it("renderiza Feito/Não feito conforme attended e some no modo anônimo", async () => {
    renderPage();
    await screen.findByText("Ana");

    expect(screen.getByText("Feito")).not.toBeNull();
    expect(screen.getByText("Não feito")).not.toBeNull();

    await openSelectAndPick("Pesquisa");
    await screen.findByRole("combobox", { name: "Formulário" });

    expect(screen.queryByText("Feito")).toBeNull();
    expect(screen.queryByText("Não feito")).toBeNull();
  });
});

describe("AttendeesPage — useSetRecordCount", () => {
  it("escreve o total do modo ativo, sem escritor duplo ao trocar para o modo anônimo", async () => {
    renderPage();
    await screen.findByText("Ana");

    expect(screen.getByTestId("record-count").textContent).toBe(String(REGISTRATIONS.length));

    await openSelectAndPick("Pesquisa");

    await waitFor(() => {
      expect(screen.getByTestId("record-count").textContent).toBe("3");
    });
  });
});
