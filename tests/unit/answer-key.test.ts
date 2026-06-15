import { describe, expect, it } from "vitest";
import { answerKeyForField } from "@/lib/api/public";

describe("answerKeyForField", () => {
  it("mapeia campos fixos para as chaves do backend", () => {
    expect(answerKeyForField({ label: "Nome", type: "text" })).toBe("nome");
    expect(answerKeyForField({ label: "E-mail", type: "email" })).toBe("email");
    expect(answerKeyForField({ label: "Telefone", type: "phone" })).toBe("telefone");
  });

  it("usa o tipo quando a label difere", () => {
    expect(answerKeyForField({ label: "Seu melhor e-mail", type: "email" })).toBe(
      "email",
    );
    expect(answerKeyForField({ label: "WhatsApp", type: "phone" })).toBe("telefone");
  });

  it("campos customizados usam a própria label", () => {
    expect(answerKeyForField({ label: "Endereço", type: "text" })).toBe("Endereço");
    expect(answerKeyForField({ label: "Instagram", type: "text" })).toBe("Instagram");
  });
});
