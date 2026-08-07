// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS_PATH = path.resolve(__dirname, "../../../app/globals.css");
const css = readFileSync(CSS_PATH, "utf-8");

type Rgb = [number, number, number];

function hslToRgb(h: number, s: number, l: number): Rgb {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m].map((v) => Math.round(v * 255)) as Rgb;
}

function rgbToHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function relativeLuminance([r, g, b]: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Extrai as tripletas --color-* de :root, com o hex em comentário quando presente. */
function parseColorTokens(source: string): Record<string, { hsl: [number, number, number]; hex?: string }> {
  const rootMatch = source.match(/:root\s*{([\s\S]*?)^\s{2}}/m);
  if (!rootMatch) throw new Error("bloco :root não encontrado em globals.css");
  const rootBlock = rootMatch[1];
  const tokens: Record<string, { hsl: [number, number, number]; hex?: string }> = {};
  const re = /--color-([a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%;\s*(?:\/\*\s*(#[0-9a-fA-F]{6}))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rootBlock))) {
    const [, name, h, s, l, hex] = m;
    tokens[name] = { hsl: [Number(h), Number(s), Number(l)], hex: hex?.toLowerCase() };
  }
  return tokens;
}

const tokens = parseColorTokens(css);
const rgbOf = (name: string): Rgb => hslToRgb(...tokens[name].hsl);

describe("paleta de marca — tokens presentes", () => {
  it("define as seis cores do CLAUDE.md §Cores + o hover derivado", () => {
    expect(Object.keys(tokens).sort()).toEqual(
      ["accent", "accent-ink", "accent-ink-hover", "bg-dark", "bg-dark-2", "ink", "offwhite"].sort(),
    );
  });
});

describe("round-trip tripleta HSL → hex", () => {
  for (const name of ["accent", "accent-ink", "ink", "offwhite", "bg-dark", "bg-dark-2"]) {
    it(`--color-${name} bate com o hex do comentário`, () => {
      const token = tokens[name];
      expect(token.hex, `--color-${name} sem hex em comentário`).toBeDefined();
      expect(rgbToHex(rgbOf(name))).toBe(token.hex);
    });
  }
});

describe("pares permitidos — CLAUDE.md §Cores", () => {
  it("accent-ink sobre offwhite ≥ 4.5:1 (texto, AA)", () => {
    expect(contrast(rgbOf("accent-ink"), rgbOf("offwhite"))).toBeGreaterThanOrEqual(4.5);
  });

  it("ink sobre offwhite ≥ 4.5:1 (texto, AA)", () => {
    expect(contrast(rgbOf("ink"), rgbOf("offwhite"))).toBeGreaterThanOrEqual(4.5);
  });

  it("accent sobre bg-dark ≥ 4.5:1 (texto, AA)", () => {
    expect(contrast(rgbOf("accent"), rgbOf("bg-dark"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("pares proibidos — CLAUDE.md §Cores", () => {
  it("accent sobre offwhite < 3:1 (nunca usar accent sobre superfície clara)", () => {
    expect(contrast(rgbOf("accent"), rgbOf("offwhite"))).toBeLessThan(3);
  });

  it("accent-ink sobre bg-dark < 3:1 (nunca usar accent-ink sobre bg-dark)", () => {
    expect(contrast(rgbOf("accent-ink"), rgbOf("bg-dark"))).toBeLessThan(3);
  });

  it("accent-ink sobre bg-dark-2 < 3:1 (nunca usar accent-ink sobre bg-dark-2)", () => {
    expect(contrast(rgbOf("accent-ink"), rgbOf("bg-dark-2"))).toBeLessThan(3);
  });
});
