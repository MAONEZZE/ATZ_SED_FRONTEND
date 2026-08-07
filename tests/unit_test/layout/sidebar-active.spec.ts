import { describe, expect, it } from "vitest";
import { isActive } from "@/lib/utils/nav";

describe("isActive", () => {
  it("casa igualdade exata", () => {
    expect(isActive("/events", "/events")).toBe(true);
  });

  it("casa prefixo com barra (rota filha)", () => {
    expect(isActive("/events/123/attendees", "/events")).toBe(true);
  });

  it("não casa prefixo sem barra (falso positivo de nome parecido)", () => {
    expect(isActive("/events-arquivados", "/events")).toBe(false);
  });

  it("não casa rota irmã", () => {
    expect(isActive("/messages", "/events")).toBe(false);
  });

  it("não casa quando pathname é prefixo do href, não o contrário", () => {
    expect(isActive("/events", "/events/123")).toBe(false);
  });
});
