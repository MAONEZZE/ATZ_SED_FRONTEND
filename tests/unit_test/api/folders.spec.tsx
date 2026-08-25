import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const patchMock = vi.mocked(api.patch);
const deleteMock = vi.mocked(api.delete);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
  getMock.mockResolvedValue([]);
  postMock.mockResolvedValue(undefined);
  patchMock.mockResolvedValue(undefined);
  deleteMock.mockResolvedValue(undefined);
});

describe("pastas no escopo de evento", () => {
  const scope = { resourceType: "message_template" as const, eventId: "evt-1" };

  it("coloca eventId na rota do GET, nunca na query", async () => {
    renderHook(() => useFolders(scope), { wrapper });

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(getMock).toHaveBeenCalledWith(
      "/events/evt-1/folders?resourceType=message_template",
    );
  });

  it("usa as rotas de evento e não envia eventId nos corpos de escrita", async () => {
    const { result } = renderHook(
      () => ({
        create: useCreateFolder(scope),
        rename: useRenameFolder(scope),
        remove: useDeleteFolder(scope),
        reorder: useReorderFolders(scope),
      }),
      { wrapper },
    );

    await act(() => result.current.create.mutateAsync({ name: "Campanhas" }));
    await act(() =>
      result.current.rename.mutateAsync({ id: "folder-1", name: "Convites" }),
    );
    await act(() =>
      result.current.reorder.mutateAsync({ ids: ["folder-1"], parentId: null }),
    );
    await act(() => result.current.remove.mutateAsync("folder-1"));

    expect(postMock).toHaveBeenCalledWith("/events/evt-1/folders", {
      resourceType: "message_template",
      name: "Campanhas",
      parentId: null,
    });
    expect(patchMock).toHaveBeenCalledWith("/events/evt-1/folders/folder-1", {
      name: "Convites",
    });
    expect(patchMock).toHaveBeenCalledWith("/events/evt-1/folders/reorder", {
      resourceType: "message_template",
      ids: ["folder-1"],
      parentId: null,
    });
    expect(deleteMock).toHaveBeenCalledWith("/events/evt-1/folders/folder-1");
  });
});
