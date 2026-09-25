import { describe, expect, it } from "vitest";
import {
  SELECT_RADIO_MAX,
  fieldHasOptions,
  fieldOptions,
  formatAnswer,
  documentMaxFiles,
  rendersAsRadioGroup,
} from "@/lib/forms/field-types";

describe("field-types registry", () => {
  it("marca só select/multiselect como tendo opções", () => {
    expect(fieldHasOptions("select")).toBe(true);
    expect(fieldHasOptions("multiselect")).toBe(true);
    expect(fieldHasOptions("text")).toBe(false);
    expect(fieldHasOptions("checkbox")).toBe(false);
    expect(fieldHasOptions("document")).toBe(false);
  });

  it("normaliza options, filtrando não-strings e ausência", () => {
    expect(fieldOptions({ options: ["a", 1, "b", null] })).toEqual(["a", "b"]);
    expect(fieldOptions({})).toEqual([]);
    expect(fieldOptions({ options: "nope" })).toEqual([]);
  });

  it("usa limite fixo de 5 arquivos para document", () => {
    expect(documentMaxFiles({ options: { maxFiles: 3 } })).toBe(5);
    expect(documentMaxFiles({ options: null })).toBe(5);
    expect(documentMaxFiles({ options: { maxFiles: 0 } })).toBe(5);
  });

  it("usa radio até o limite e dropdown acima dele", () => {
    expect(rendersAsRadioGroup(Array(SELECT_RADIO_MAX).fill("x"))).toBe(true);
    expect(rendersAsRadioGroup(Array(SELECT_RADIO_MAX + 1).fill("x"))).toBe(false);
  });

  it("formata respostas por shape do valor", () => {
    expect(formatAnswer(["a", "b"])).toBe("a, b");
    expect(formatAnswer(true)).toBe("Sim");
    expect(formatAnswer(false)).toBe("Não");
    expect(formatAnswer("")).toBe("—");
    expect(formatAnswer(null)).toBe("—");
    expect(formatAnswer("texto")).toBe("texto");
    expect(
      formatAnswer([
        { url: "https://cdn/x", name: "arquivo.pdf", mimetype: null, size: null },
      ]),
    ).toBe("arquivo.pdf");
  });
});
