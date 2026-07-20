import { afterEach, describe, expect, it, vi } from "vitest";
import { submitPublicNps, submitPublicPostEvent } from "@/lib/api/public";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: () => Promise.resolve(body),
  };
}

const NOT_FOUND_MESSAGE =
  "Não encontramos uma inscrição com esse e-mail ou telefone. Verifique os dados e tente novamente.";

describe("submitPublicPostEvent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lança mensagem específica quando identifier não é encontrado (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { message: "Not Found" })),
    );

    await expect(
      submitPublicPostEvent("evt-1", { identifier: "x@x.com", answers: {} }),
    ).rejects.toThrow(NOT_FOUND_MESSAGE);
  });

  it("repassa body.message em outros erros", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { message: "payload inválido" })),
    );

    await expect(
      submitPublicPostEvent("evt-1", { identifier: "x@x.com", answers: {} }),
    ).rejects.toThrow("payload inválido");
  });
});

describe("submitPublicNps", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia só answers, sem identifier (NPS anônimo)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal("fetch", fetchMock);

    await submitPublicNps("evt-1", { answers: { nota: 10 } });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ answers: { nota: 10 } });
  });

  it("repassa body.message em erros", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(500, { message: "erro interno" })),
    );

    await expect(submitPublicNps("evt-1", { answers: {} })).rejects.toThrow(
      "erro interno",
    );
  });
});
