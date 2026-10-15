import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  normalizeSlugInput,
  publicEventUrl,
  SLUG_FORMAT_MESSAGE,
  SLUG_IN_USE_MESSAGE,
  SLUG_LENGTH_MESSAGE,
  slugErrorFromApi,
  slugFromTitle,
} from "@/lib/utils/slug";

describe("normalizeSlugInput — normalização enquanto digita", () => {
  it.each([
    ["Meu Evento", "meu-evento"],
    ["evento-ação", "evento-acao"],
    ["meu_evento", "meu-evento"],
    ["meu--evento", "meu-evento"],
    ["  -evento", "evento"],
    ["Évènement 2026!", "evenement-2026"],
  ])("%j vira %j", (input, expected) => {
    expect(normalizeSlugInput(input)).toBe(expected);
  });

  it("mantém o hífen final para permitir continuar digitando", () => {
    expect(normalizeSlugInput("meu-")).toBe("meu-");
  });

  it("corta em 100 caracteres", () => {
    expect(normalizeSlugInput("a".repeat(150))).toHaveLength(100);
  });
});

describe("slugFromTitle — sugestão a partir do título", () => {
  it("normaliza o título sem sufixo aleatório", () => {
    expect(slugFromTitle("Meu Evento Incrível")).toBe("meu-evento-incrivel");
  });

  it("remove hífen final", () => {
    expect(slugFromTitle("Workshop! ")).toBe("workshop");
  });

  it("devolve vazio quando o resultado seria curto demais", () => {
    expect(slugFromTitle("A!")).toBe("");
    expect(slugFromTitle("")).toBe("");
  });
});

describe("publicEventUrl", () => {
  it("monta <origem>/e/<slug>", () => {
    expect(publicEventUrl("https://app.test", "meu-evento")).toBe(
      "https://app.test/e/meu-evento",
    );
  });
});

describe("slugErrorFromApi", () => {
  it("409 de slug em uso", () => {
    expect(slugErrorFromApi(new ApiError(409, "Slug already in use"))).toBe(
      SLUG_IN_USE_MESSAGE,
    );
  });

  it("400 de formato", () => {
    const e = new ApiError(
      400,
      "slug must contain only lowercase letters, digits and single hyphens",
    );
    expect(slugErrorFromApi(e)).toBe(SLUG_FORMAT_MESSAGE);
  });

  it("400 de tamanho", () => {
    const e = new ApiError(400, "slug must be longer than or equal to 3 characters");
    expect(slugErrorFromApi(e)).toBe(SLUG_LENGTH_MESSAGE);
  });

  it("ignora erros que não são do slug", () => {
    expect(slugErrorFromApi(new ApiError(400, "title should not be empty"))).toBeNull();
    expect(slugErrorFromApi(new ApiError(500, "Internal"))).toBeNull();
    expect(slugErrorFromApi(new Error("slug"))).toBeNull();
  });
});
