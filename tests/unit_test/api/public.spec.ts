import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPublicForms,
  submitPublicCheckin,
  submitPublicFormResponse,
} from "@/lib/api/public";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: () => Promise.resolve(body),
  };
}

describe("getPublicForms", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca a lista de formulários públicos do evento", async () => {
    const forms = [
      { id: "f1", name: "Inscrição", slug: "inscricao", order: 0, description: null, requireImageAuthorization: false, anonymous: false },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, forms));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPublicForms("evt-1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3000/public/events/evt-1/forms",
    );
    expect(result).toEqual(forms);
  });

  it("retorna lista vazia em erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, {})));

    await expect(getPublicForms("evt-1")).resolves.toEqual([]);
  });
});

describe("submitPublicFormResponse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia telefone e respostas para o formulário do evento", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { registrationId: "reg-1", created: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPublicFormResponse("evt-1", "inscricao", {
      phone: "+5511999998888",
      answers: { Nome: "Ana" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3000/public/events/evt-1/forms/inscricao/responses",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      phone: "+5511999998888",
      answers: { Nome: "Ana" },
    });
    expect(result).toEqual({ registrationId: "reg-1", created: true });
  });

  it("formulário anônimo: registrationId vem null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(201, { registrationId: null, created: true })),
    );

    const result = await submitPublicFormResponse("evt-1", "feedback", {
      answers: { Nota: "10" },
    });

    expect(result.registrationId).toBeNull();
  });

  it("repassa body.message em erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { message: "Campo obrigatório ausente" })),
    );

    await expect(
      submitPublicFormResponse("evt-1", "inscricao", { answers: {} }),
    ).rejects.toThrow("Campo obrigatório ausente");
  });
});

describe("submitPublicCheckin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posta só o telefone na rota genérica, sem slug de evento", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await submitPublicCheckin("+5511999998888");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/public/checkin");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ phone: "+5511999998888" });
  });

  it("repassa body.message do backend em erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { message: "Nenhuma inscrição com esse telefone" })),
    );

    await expect(submitPublicCheckin("+5511999998888")).rejects.toThrow(
      "Nenhuma inscrição com esse telefone",
    );
  });

  it("usa mensagem padrão quando o erro não tem body JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "500",
        headers: new Headers(),
        json: () => Promise.reject(new Error("no json")),
      }),
    );

    await expect(submitPublicCheckin("+5511999998888")).rejects.toThrow("Falha ao fazer check-in");
  });
});
