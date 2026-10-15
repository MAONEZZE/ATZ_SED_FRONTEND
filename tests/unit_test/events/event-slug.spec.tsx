import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";

(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "event-1" }),
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/utils/revalidate-public", () => ({
  revalidatePublicEvent: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const EVENT = {
  id: "event-1",
  title: "Evento Teste",
  slug: "evento-teste",
  status: "published",
  location: null,
  capacity: null,
  dressCode: null,
  groupLink: null,
  eventDate: null,
  endDate: null,
  recurrenceFreq: null,
  recurrenceInterval: null,
  recurrenceUntil: null,
  whatsappInstanceId: null,
  coverUrl: null,
  updatedAt: "2026-07-16T00:00:00.000Z",
};

// O GET devolve o que o último PATCH gravou, como o backend.
let serverEvent: typeof EVENT = EVENT;

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      get: vi.fn((path: string) => {
        if (path === "/whatsapp-instances") return Promise.resolve([]);
        if (path === "/events/event-1") return Promise.resolve(serverEvent);
        throw new Error(`unexpected GET ${path}`);
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import NewEventPage from "@/app/(dashboard)/events/new/page";
import EditEventPage from "@/app/(dashboard)/events/[id]/edit/page";

const postMock = vi.mocked(api.post);
const patchMock = vi.mocked(api.patch);

function renderPage(Page: React.ComponentType) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  );
}

const slugInput = () => screen.getByLabelText(/slug/i) as HTMLInputElement;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

beforeEach(() => {
  serverEvent = EVENT;
  postMock.mockReset();
  patchMock.mockReset();
});
afterEach(() => cleanup());

describe("Novo evento — slug", () => {
  it("sugere o slug a partir do título e mostra a prévia da URL", async () => {
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Meu Evento Incrível");

    await waitFor(() => expect(slugInput().value).toBe("meu-evento-incrivel"));
    expect(screen.getByText(`${window.location.origin}/e/meu-evento-incrivel`)).toBeDefined();
  });

  it("para de sobrescrever depois que o usuário edita o slug", async () => {
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Primeiro");
    type(slugInput(), "Meu Slug_Próprio");
    expect(slugInput().value).toBe("meu-slug-proprio");

    type(screen.getByLabelText(/título/i), "Outro título");
    await waitFor(() => expect(slugInput().value).toBe("meu-slug-proprio"));
  });

  it("envia o slug escolhido no POST", async () => {
    postMock.mockResolvedValue({ ...EVENT, id: "novo", slug: "meu-slug" });
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Qualquer");
    type(slugInput(), "meu-slug");
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toMatchObject({ slug: "meu-slug" });
  });

  it("campo vazio não envia slug", async () => {
    postMock.mockResolvedValue({ ...EVENT, id: "novo" });
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Qualquer");
    type(slugInput(), "");
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).not.toHaveProperty("slug");
  });

  it("barra slug inválido no cliente", async () => {
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Qualquer");
    type(slugInput(), "ab");
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));

    expect(await screen.findByText(/entre 3 e 100 caracteres/i)).toBeDefined();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("mostra o 409 no campo sem perder o formulário", async () => {
    postMock.mockRejectedValue(new ApiError(409, "Slug already in use"));
    renderPage(NewEventPage);
    type(screen.getByLabelText(/título/i), "Meu Evento");
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));

    expect(await screen.findByText(/já está em uso/i)).toBeDefined();
    expect((screen.getByLabelText(/título/i) as HTMLInputElement).value).toBe("Meu Evento");
    expect(slugInput().value).toBe("meu-evento");
  });
});

describe("Editar evento — slug", () => {
  async function openEdit() {
    renderPage(EditEventPage);
    await waitFor(() => expect(slugInput().value).toBe("evento-teste"));
  }
  const save = () => fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

  it("editar só o título não envia slug", async () => {
    patchMock.mockResolvedValue({ ...EVENT, title: "Novo título" });
    await openEdit();
    type(screen.getByLabelText(/título/i), "Novo título");
    save();

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).not.toHaveProperty("slug");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("trocar o slug pede confirmação; cancelar não envia nada", async () => {
    await openEdit();
    type(slugInput(), "novo-slug");
    save();

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(`${window.location.origin}/e/evento-teste`);
    expect(dialog.textContent).toMatch(/publicado/i);

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("confirmar envia o slug novo e atualiza a prévia com o slug da resposta", async () => {
    patchMock.mockImplementation(async () => (serverEvent = { ...EVENT, slug: "novo-slug" }));
    await openEdit();
    type(slugInput(), "novo-slug");
    save();
    fireEvent.click(await screen.findByRole("button", { name: /alterar slug e salvar/i }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).toMatchObject({ slug: "novo-slug" });
    expect(await screen.findByText(`${window.location.origin}/e/novo-slug`)).toBeDefined();
  });

  it("409 na edição aparece no campo slug", async () => {
    patchMock.mockRejectedValue(new ApiError(409, "Slug already in use"));
    await openEdit();
    type(slugInput(), "ja-usado");
    save();
    fireEvent.click(await screen.findByRole("button", { name: /alterar slug e salvar/i }));

    expect(await screen.findByText(/já está em uso/i)).toBeDefined();
    expect(slugInput().value).toBe("ja-usado");
  });
});
