import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useAddCollaborator, useUpdateCollaboratorRole } from "@/lib/api/collaborators";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const postMock = vi.mocked(api.post);
const patchMock = vi.mocked(api.patch);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  postMock.mockReset();
  patchMock.mockReset();
  postMock.mockResolvedValue(undefined);
  patchMock.mockResolvedValue(undefined);
});

describe("colaboradores de evento", () => {
  it("envia o papel escolhido ao adicionar um colaborador", async () => {
    const { result } = renderHook(() => useAddCollaborator("evt-1"), { wrapper });

    await act(() =>
      result.current.mutateAsync({ email: "ana@example.com", role: "read" }),
    );

    expect(postMock).toHaveBeenCalledWith("/events/evt-1/collaborators", {
      email: "ana@example.com",
      role: "read",
    });
  });

  it("atualiza o papel pelo profileId", async () => {
    const { result } = renderHook(() => useUpdateCollaboratorRole("evt-1"), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({ profileId: "profile-2", role: "admin" }),
    );

    expect(patchMock).toHaveBeenCalledWith("/events/evt-1/collaborators/profile-2", {
      role: "admin",
    });
  });
});
