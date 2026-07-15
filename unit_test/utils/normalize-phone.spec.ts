import { describe, expect, it } from "vitest";
import { normalizeBrPhone } from "@/lib/utils/normalize-phone";

describe("normalizeBrPhone", () => {
  it("adiciona 55 quando ausente", () => {
    expect(normalizeBrPhone("11999998888")).toBe("5511999998888");
  });

  it("mantém quando já começa com 55", () => {
    expect(normalizeBrPhone("5511999998888")).toBe("5511999998888");
  });

  it("remove formatação e símbolos", () => {
    expect(normalizeBrPhone("+55 11 99999-8888")).toBe("5511999998888");
  });

  it("retorna vazio para entrada sem dígitos", () => {
    expect(normalizeBrPhone("abc")).toBe("");
  });
});
