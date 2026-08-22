import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { eventsListPath, fetchEventsByFolder } from "@/lib/api/events";
import type { EventObject, PaginatedResponse } from "@/lib/api/types";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = vi.mocked(api.get);

function event(id: string, folderId: string | null): EventObject {
  return { id, folderId } as EventObject;
}

function response(
  data: EventObject[],
  total = data.length,
  page = 1,
  limit = 100,
): PaginatedResponse<EventObject> {
  return { data, total, page, limit };
}

beforeEach(() => {
  getMock.mockReset();
});

describe("eventsListPath", () => {
  it("omite folderId quando a pasta é null", () => {
    expect(eventsListPath(1, 20, null)).toBe("/events?page=1&limit=20");
  });

  it("omite folderId quando nenhum filtro foi informado", () => {
    expect(eventsListPath(2, 30)).toBe("/events?page=2&limit=30");
  });

  it("envia folderId somente quando há um id de pasta", () => {
    expect(eventsListPath(1, 50, "folder-1")).toBe(
      "/events?page=1&limit=50&folderId=folder-1",
    );
  });
});

describe("fetchEventsByFolder", () => {
  it("busca sem folderId e mantém somente os eventos da pasta", async () => {
    getMock.mockResolvedValue(
      response([event("root", null), event("inside", "folder-1")]),
    );

    await expect(fetchEventsByFolder(1, 20, "folder-1")).resolves.toEqual(
      response([event("inside", "folder-1")], 1, 1, 20),
    );
    expect(getMock).toHaveBeenCalledWith("/events?page=1&limit=100");
  });

  it("pagina o resultado depois de aplicar o escopo da pasta", async () => {
    getMock.mockResolvedValue(
      response([
        event("first", null),
        event("ignored", "folder-1"),
        event("second", null),
      ]),
    );

    await expect(fetchEventsByFolder(2, 1, null)).resolves.toEqual(
      response([event("second", null)], 2, 2, 1),
    );
  });

  it("carrega todas as páginas da API antes de filtrar", async () => {
    getMock
      .mockResolvedValueOnce(response([event("root", null)], 101))
      .mockResolvedValueOnce(response([event("inside", "folder-1")], 101, 2));

    await expect(fetchEventsByFolder(1, 20, "folder-1")).resolves.toMatchObject({
      data: [event("inside", "folder-1")],
      total: 1,
    });
    expect(getMock).toHaveBeenNthCalledWith(2, "/events?page=2&limit=100");
  });
});
