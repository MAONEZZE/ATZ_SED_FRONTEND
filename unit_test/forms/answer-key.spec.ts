import { describe, expect, it } from "vitest";
import { answerKeyForField } from "@/lib/api/public";

describe("answerKeyForField", () => {
  it("usa a própria label como chave, independente do tipo", () => {
    expect(answerKeyForField({ label: "Nome", type: "text" })).toBe("Nome");
    expect(answerKeyForField({ label: "E-mail", type: "email" })).toBe("E-mail");
    expect(answerKeyForField({ label: "Telefone", type: "phone" })).toBe("Telefone");
    expect(answerKeyForField({ label: "Endereço", type: "text" })).toBe("Endereço");
    expect(answerKeyForField({ label: "Instagram", type: "text" })).toBe("Instagram");
  });

  it("não força a label a um alias fixo quando a pergunta é customizada", () => {
    // backend valida campo obrigatório pela label literal — forçar um alias
    // (ex.: "telefone") faz o backend responder "Campo obrigatório ausente"
    // mesmo com o valor presente sob a chave errada.
    expect(answerKeyForField({ label: "qual o seu telefone?", type: "phone" })).toBe(
      "qual o seu telefone?",
    );
    expect(answerKeyForField({ label: "Seu melhor e-mail", type: "email" })).toBe(
      "Seu melhor e-mail",
    );
  });
});
