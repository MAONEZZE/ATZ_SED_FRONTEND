import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useEvents, useMoveEvent } from "@/lib/api/events";
import { useFolders, useMoveFolder, useReorderFolders } from "@/lib/api/folders";
import { useFormFields, useReorderFormFields } from "@/lib/api/form-fields";
import { useForms, useReorderForms } from "@/lib/api/forms";
import { useAllTemplates, useMoveTemplate } from "@/lib/api/global-messaging";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  EventObject,
  Folder,
  Form,
  FormField,
  PaginatedResponse,
  TemplateWithEvent,
} from "@/lib/api/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = vi.mocked(api.get);
const patchMock = vi.mocked(api.patch);

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function event(id: string): EventObject {
  return { id, folderId: null } as EventObject;
}

function folder(id: string, parentId: string | null, children: Folder[] = []): Folder {
  return { id, name: id, parentId, order: 0, children } as Folder;
}

beforeEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  patchMock.mockResolvedValue(undefined);
});

describe("cache otimista do drag-and-drop", () => {
  it("mantém a nova ordem dos eventos depois que a API responde", async () => {
    const { queryClient, wrapper } = setup();
    const key = queryKeys.events({ page: 1, limit: 20, folderId: null });
    const previous: PaginatedResponse<EventObject> = {
      data: [event("a"), event("b")],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(key, previous);
    getMock.mockResolvedValue(previous);

    const { result } = renderHook(
      () => ({ query: useEvents(1, 20, null), move: useMoveEvent() }),
      { wrapper },
    );

    await act(() => result.current.move.mutateAsync({ id: "b", beforeId: "a" }));

    expect(
      queryClient
        .getQueryData<PaginatedResponse<EventObject>>(key)
        ?.data.map(({ id }) => id),
    ).toEqual(["b", "a"]);
    await waitFor(() =>
      expect(result.current.query.data?.data.map(({ id }) => id)).toEqual(["b", "a"]),
    );
    expect(getMock).not.toHaveBeenCalled();
  });

  it("mantém o evento nas consultas sem filtro ao movê-lo para uma pasta", async () => {
    const { queryClient, wrapper } = setup();
    const rootKey = queryKeys.events({ page: 1, limit: 20, folderId: null });
    const allKey = queryKeys.events({ page: 1, limit: 20, folderId: undefined });
    const previous: PaginatedResponse<EventObject> = {
      data: [event("a"), event("b")],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(rootKey, previous);
    queryClient.setQueryData(allKey, previous);

    const { result } = renderHook(() => useMoveEvent(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "b", folderId: "folder-1" }));

    expect(
      queryClient
        .getQueryData<PaginatedResponse<EventObject>>(rootKey)
        ?.data.map(({ id }) => id),
    ).toEqual(["a"]);
    expect(
      queryClient
        .getQueryData<PaginatedResponse<EventObject>>(allKey)
        ?.data.map(({ id, folderId }) => ({ id, folderId })),
    ).toEqual([
      { id: "a", folderId: null },
      { id: "b", folderId: "folder-1" },
    ]);
  });

  it("mantém evento compartilhado na raiz efetiva ao reordenar", async () => {
    const { queryClient, wrapper } = setup();
    const key = queryKeys.events({
      page: 1,
      limit: 20,
      folderId: null,
      folderIds: ["folder-mine"],
    });
    const previous: PaginatedResponse<EventObject> = {
      data: [event("mine"), { ...event("shared"), folderId: "folder-from-owner" }],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(key, previous);

    const { result } = renderHook(() => useMoveEvent(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "shared", beforeId: "mine" }));

    expect(
      queryClient
        .getQueryData<PaginatedResponse<EventObject>>(key)
        ?.data.map(({ id }) => id),
    ).toEqual(["shared", "mine"]);
  });

  it("mantém a nova ordem dos templates depois que a API responde", async () => {
    const { queryClient, wrapper } = setup();
    const params = {
      page: 1,
      limit: 20,
      channel: undefined,
      eventId: null,
      folderId: null,
    };
    const key = queryKeys.allTemplates(params);
    const previous: PaginatedResponse<TemplateWithEvent> = {
      data: [
        { id: "a", folderId: null } as TemplateWithEvent,
        { id: "b", folderId: null } as TemplateWithEvent,
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(key, previous);
    getMock.mockResolvedValue(previous);

    const { result } = renderHook(
      () => ({
        query: useAllTemplates(1, 20, undefined, null, null),
        move: useMoveTemplate(),
      }),
      { wrapper },
    );

    await act(() =>
      result.current.move.mutateAsync({ id: "b", folderId: null, beforeId: "a" }),
    );

    await waitFor(() =>
      expect(result.current.query.data?.data.map(({ id }) => id)).toEqual(["b", "a"]),
    );
    expect(getMock).not.toHaveBeenCalled();
  });

  it("não manda folderId para /move — a rota o rejeita (forbidNonWhitelisted)", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useMoveTemplate(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ id: "b", folderId: "folder-1", beforeId: "a" }),
    );

    expect(patchMock).toHaveBeenCalledWith("/templates/b", { folderId: "folder-1" });
    expect(patchMock).toHaveBeenCalledWith("/templates/b/move", { beforeId: "a" });
  });

  it("só chama a rota da pasta quando não há reordenação", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useMoveTemplate(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "b", folderId: null }));

    expect(patchMock).toHaveBeenCalledExactlyOnceWith("/templates/b", {
      folderId: null,
    });
  });

  it("mantém o template nas consultas sem filtro ao movê-lo para uma pasta", async () => {
    const { queryClient, wrapper } = setup();
    const filteredKey = queryKeys.allTemplates({ folderId: null });
    const allKey = queryKeys.allTemplates({ folderId: undefined });
    const previous: PaginatedResponse<TemplateWithEvent> = {
      data: [
        { id: "a", folderId: null } as TemplateWithEvent,
        { id: "b", folderId: null } as TemplateWithEvent,
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(filteredKey, previous);
    queryClient.setQueryData(allKey, previous);

    const { result } = renderHook(() => useMoveTemplate(), { wrapper });

    await act(() => result.current.mutateAsync({ id: "b", folderId: "folder-1" }));

    expect(
      queryClient
        .getQueryData<PaginatedResponse<TemplateWithEvent>>(filteredKey)
        ?.data.map(({ id }) => id),
    ).toEqual(["a"]);
    expect(
      queryClient
        .getQueryData<PaginatedResponse<TemplateWithEvent>>(allKey)
        ?.data.map(({ id, folderId }) => ({ id, folderId })),
    ).toEqual([
      { id: "a", folderId: null },
      { id: "b", folderId: "folder-1" },
    ]);
  });

  it("mantém a nova ordem dos formulários e dos campos sem refetch", async () => {
    const { queryClient, wrapper } = setup();
    const formsKey = queryKeys.forms("event-1");
    const fieldsKey = queryKeys.formFields("event-1", "form-1");
    queryClient.setQueryData<Form[]>(formsKey, [
      { id: "form-a", order: 0 } as Form,
      { id: "form-b", order: 1 } as Form,
    ]);
    queryClient.setQueryData<FormField[]>(fieldsKey, [
      { id: "field-a", order: 0 } as FormField,
      { id: "field-b", order: 1 } as FormField,
    ]);

    const { result } = renderHook(
      () => ({
        forms: useForms("event-1"),
        fields: useFormFields("event-1", "form-1"),
        reorderForms: useReorderForms("event-1"),
        reorderFields: useReorderFormFields("event-1", "form-1"),
      }),
      { wrapper },
    );

    await act(() => result.current.reorderForms.mutateAsync(["form-b", "form-a"]));
    await act(() =>
      result.current.reorderFields.mutateAsync([
        { id: "field-b", order: 0 },
        { id: "field-a", order: 1 },
      ]),
    );

    await waitFor(() => {
      expect(
        [...(result.current.forms.data ?? [])]
          .sort((a, b) => a.order - b.order)
          .map(({ id }) => id),
      ).toEqual(["form-b", "form-a"]);
      expect(
        [...(result.current.fields.data ?? [])]
          .sort((a, b) => a.order - b.order)
          .map(({ id }) => id),
      ).toEqual(["field-b", "field-a"]);
    });
    expect(getMock).not.toHaveBeenCalled();
  });

  it("reordena as pastas no cache antes de a API responder", async () => {
    const { queryClient, wrapper } = setup();
    const scope = { resourceType: "event" as const };
    const key = queryKeys.folders(scope);
    queryClient.setQueryData<Folder[]>(key, [folder("a", null), folder("b", null)]);
    let resolvePatch!: () => void;
    patchMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = () => resolve(undefined);
      }),
    );

    const { result } = renderHook(
      () => ({ query: useFolders(scope), reorder: useReorderFolders(scope) }),
      { wrapper },
    );

    act(() => result.current.reorder.mutate({ ids: ["b", "a"], parentId: null }));

    await waitFor(() =>
      expect(result.current.query.data?.map(({ id }) => id)).toEqual(["b", "a"]),
    );
    await act(async () => resolvePatch());
  });

  it("aninha a pasta com PATCH — /reorder ignora id de outro pai", async () => {
    const { queryClient, wrapper } = setup();
    const scope = { resourceType: "event" as const };
    const key = queryKeys.folders(scope);
    queryClient.setQueryData<Folder[]>(key, [
      folder("source", null),
      folder("target", null, [folder("child", "target")]),
    ]);
    getMock.mockResolvedValue([
      folder("target", null, [folder("child", "target"), folder("source", "target")]),
    ]);
    let resolvePatch!: () => void;
    patchMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = () => resolve(undefined);
      }),
    );

    const { result } = renderHook(
      () => ({ query: useFolders(scope), move: useMoveFolder(scope) }),
      { wrapper },
    );

    act(() => result.current.move.mutate({ id: "source", parentId: "target" }));

    await waitFor(() => {
      expect(result.current.query.data?.map(({ id }) => id)).toEqual(["target"]);
      expect(result.current.query.data?.[0].children.map(({ id }) => id)).toEqual([
        "child",
        "source",
      ]);
    });
    // O aninhamento só sobrevive ao reload se for no PATCH da própria pasta.
    expect(patchMock).toHaveBeenCalledExactlyOnceWith("/folders/source", {
      parentId: "target",
    });
    await act(async () => resolvePatch());
  });

  it("reordena o destino depois de trocar a pasta de nível", async () => {
    const { queryClient, wrapper } = setup();
    const scope = { resourceType: "event" as const };
    const key = queryKeys.folders(scope);
    queryClient.setQueryData<Folder[]>(key, [
      folder("a", null, [folder("source", "a")]),
      folder("b", null),
      folder("c", null),
    ]);

    const { result } = renderHook(() => useMoveFolder(scope), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: "source",
        parentId: null,
        siblingIds: ["b", "source", "c"],
      }),
    );

    expect(patchMock).toHaveBeenCalledWith("/folders/source", { parentId: null });
    expect(patchMock).toHaveBeenCalledWith("/folders/reorder", {
      resourceType: "event",
      ids: ["b", "source", "c"],
      parentId: null,
    });
    expect(queryClient.getQueryData<Folder[]>(key)?.map(({ id }) => id)).toEqual([
      "a",
      "b",
      "source",
      "c",
    ]);
  });

  it("reconcilia com o servidor quando o template muda de pasta", async () => {
    const { queryClient, wrapper } = setup();
    const params = {
      page: 1,
      limit: 20,
      channel: undefined,
      eventId: null,
      folderId: null,
    };
    const previous: PaginatedResponse<TemplateWithEvent> = {
      data: [{ id: "a", folderId: null } as TemplateWithEvent],
      total: 1,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(queryKeys.allTemplates(params), previous);
    getMock.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    const { result } = renderHook(
      () => ({
        query: useAllTemplates(1, 20, undefined, null, null),
        move: useMoveTemplate(),
      }),
      { wrapper },
    );

    // A pasta de destino pode nem ter sido buscada ainda — só o servidor sabe
    // como as listas ficam depois do movimento.
    await act(() => result.current.move.mutateAsync({ id: "a", folderId: "folder-1" }));

    await waitFor(() => expect(getMock).toHaveBeenCalled());
  });

  it("restaura e reconcilia a lista quando a API rejeita o drop", async () => {
    const { queryClient, wrapper } = setup();
    const key = queryKeys.events({ page: 1, limit: 20, folderId: null });
    const previous: PaginatedResponse<EventObject> = {
      data: [event("a"), event("b")],
      total: 2,
      page: 1,
      limit: 20,
    };
    queryClient.setQueryData(key, previous);
    patchMock.mockRejectedValue(new Error("falha"));
    getMock.mockResolvedValue(previous);

    const { result } = renderHook(
      () => ({ query: useEvents(1, 20, null), move: useMoveEvent() }),
      { wrapper },
    );

    await act(async () => {
      await expect(
        result.current.move.mutateAsync({ id: "b", beforeId: "a" }),
      ).rejects.toThrow("falha");
    });

    expect(result.current.query.data?.data.map(({ id }) => id)).toEqual(["a", "b"]);
    await waitFor(() => expect(getMock).toHaveBeenCalled());
  });
});
