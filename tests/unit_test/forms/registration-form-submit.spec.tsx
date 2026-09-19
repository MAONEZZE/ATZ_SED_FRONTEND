import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PublicFormField } from "@/lib/api/types";

const { submitMock } = vi.hoisted(() => ({
  submitMock: vi.fn(() => Promise.resolve({ registrationId: "r1", created: true })),
}));

vi.mock("@/lib/api/public", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/public")>("@/lib/api/public");
  return { ...actual, submitPublicFormResponse: submitMock };
});

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { RegistrationForm } from "@/app/(public)/e/[slug]/registration-form";
import { fieldKey } from "@/lib/api/public";

function textField(id: string, label: string): PublicFormField {
  return { id, label, type: "text", required: true, options: null, order: 0 };
}

const byKey = (field: PublicFormField) =>
  document.getElementById(fieldKey(field)) as HTMLInputElement;

beforeEach(() => {
  submitMock.mockClear();
  localStorage.clear();
});
afterEach(() => cleanup());

describe("RegistrationForm — envio", () => {
  it("envia mesmo com label contendo ponto/colchete", async () => {
    // regressão: a label era usada como `name` do react-hook-form, que trata
    // `.`/`[`/`]` como caminho — o valor ia parar aninhado, o erro do Zod ficava
    // invisível e clicar em Enviar não fazia nada.
    const fields = [textField("1", "Ex.: cargo"), textField("2", "Nome [completo]")];
    render(<RegistrationForm slug="ev" formSlug="f" fields={fields} anonymous />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.change(byKey(fields[0]), { target: { value: "Dev" } });
    fireEvent.change(byKey(fields[1]), { target: { value: "Ruan" } });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][2]).toMatchObject({
      answers: { "Ex.: cargo": "Dev", "Nome [completo]": "Ruan" },
    });
  });

  it("campos de mesma label mantêm valores independentes", async () => {
    // dados legados: dois campos com a mesma label compartilhavam o mesmo `name`
    // e um sobrescrevia o valor do outro.
    const fields = [textField("1", "Texto"), textField("2", "Texto")];
    render(<RegistrationForm slug="ev" formSlug="dup" fields={fields} anonymous />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.change(byKey(fields[0]), { target: { value: "primeiro" } });
    fireEvent.change(byKey(fields[1]), { target: { value: "segundo" } });

    expect(byKey(fields[0]).value).toBe("primeiro");
    expect(byKey(fields[1]).value).toBe("segundo");
  });

  it("mostra o erro de validação no campo em vez de falhar em silêncio", async () => {
    const fields = [textField("1", "Ex.: cargo")];
    render(<RegistrationForm slug="ev" formSlug="err" fields={fields} anonymous />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(() => expect(screen.getByText("Campo obrigatório")).toBeDefined());
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("rascunho de uma versão anterior do formulário não zera os campos atuais", async () => {
    localStorage.setItem("reg_draft_ev_old", JSON.stringify({ "Campo Antigo": "x" }));
    const fields = [textField("1", "Nome")];
    render(<RegistrationForm slug="ev" formSlug="old" fields={fields} anonymous />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.change(byKey(fields[0]), { target: { value: "Ruan" } });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][2]).toMatchObject({ answers: { Nome: "Ruan" } });
  });
});

describe("RegistrationForm — telefone", () => {
  it("formulário não-anônimo sem campo de telefone envia sem `phone`", async () => {
    // regressão: o backend exigia `phone` em todo formulário não-anônimo e
    // devolvia 400 "Telefone é obrigatório" num formulário que nem pede o
    // campo. Hoje `phone` é opcional — o front tem que omiti-lo, não inventar
    // um valor nem bloquear o envio.
    const fields = [textField("1", "Nome")];
    render(<RegistrationForm slug="ev" formSlug="sem-tel" fields={fields} />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.change(byKey(fields[0]), { target: { value: "Ruan" } });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][2]).toMatchObject({ answers: { Nome: "Ruan" } });
    expect(submitMock.mock.calls[0][2].phone).toBeUndefined();
  });

  it("formulário com campo de telefone manda o valor no `phone` de primeiro nível", async () => {
    // o backend não lê o telefone de dentro de `answers`: sem o campo no topo
    // do corpo ele não casa com o inscrito e duplica a cada envio.
    const fields: PublicFormField[] = [
      textField("1", "Nome"),
      { id: "2", label: "Telefone", type: "phone", required: true, options: null, order: 1 },
    ];
    render(<RegistrationForm slug="ev" formSlug="com-tel" fields={fields} />);
    await waitFor(() => screen.getByText("Enviar"));

    fireEvent.change(byKey(fields[0]), { target: { value: "Ruan" } });
    fireEvent.change(byKey(fields[1]), { target: { value: "+5511999998888" } });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][2]).toMatchObject({
      phone: "+5511999998888",
      answers: { Nome: "Ruan", Telefone: "+5511999998888" },
    });
  });
});
