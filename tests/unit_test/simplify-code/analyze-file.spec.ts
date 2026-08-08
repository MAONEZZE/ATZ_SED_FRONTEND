import { describe, expect, it } from "vitest";
import { analyzeFile, DEFAULT_THRESHOLDS } from "@/tools/simplify-code/metrics.mjs";

describe("analyzeFile", () => {
  it("retorna caminho, linhas lógicas e funções", () => {
    const r = analyzeFile("lib/x.ts", "function f(a) { return a ? 1 : 2; }");
    expect(r.file).toBe("lib/x.ts");
    expect(r.logicalLines).toBe(1);
    expect(r.functions).toHaveLength(1);
  });

  it("maxComplexity é o maior CC entre as funções", () => {
    const src = "function a(x) { return x ? 1 : 2; }\nfunction b(x, y) { return x && y || x; }";
    expect(analyzeFile("lib/x.ts", src).maxComplexity).toBe(3);
  });

  it("totalComplexity é a soma dos CCs", () => {
    const src = "function a(x) { return x ? 1 : 2; }\nfunction b(x, y) { return x && y || x; }";
    expect(analyzeFile("lib/x.ts", src).totalComplexity).toBe(5);
  });

  it("arquivo sem funções tem maxComplexity 0", () => {
    expect(analyzeFile("lib/tipos.ts", "export type T = { a: string };").maxComplexity).toBe(0);
  });

  it("não é candidato quando fica abaixo dos dois limiares", () => {
    expect(analyzeFile("lib/x.ts", "function f() { return 1; }").candidate).toBe(false);
  });

  it("vira candidato por complexidade acima do limiar", () => {
    // 16 ifs => CC 17, acima do limiar padrão de 15
    const corpo = Array.from({ length: 16 }, (_, i) => `if (a === ${i}) return ${i};`).join("\n");
    const r = analyzeFile("lib/x.ts", `function f(a) {\n${corpo}\n}`);
    expect(r.maxComplexity).toBe(17);
    expect(r.candidate).toBe(true);
    expect(r.reasons).toContain("complexity");
  });

  it("vira candidato por tamanho acima do limiar", () => {
    const src = Array.from({ length: 201 }, (_, i) => `const v${i} = ${i};`).join("\n");
    const r = analyzeFile("lib/x.ts", src);
    expect(r.logicalLines).toBe(201);
    expect(r.candidate).toBe(true);
    expect(r.reasons).toContain("size");
  });

  it("aceita limiares customizados", () => {
    const r = analyzeFile("lib/x.ts", "function f(a) { return a ? 1 : 2; }", {
      complexity: 1,
      lines: 9999,
    });
    expect(r.candidate).toBe(true);
    expect(r.reasons).toEqual(["complexity"]);
  });

  it("expõe os limiares padrão do spec (CC 15, linhas 200)", () => {
    expect(DEFAULT_THRESHOLDS).toEqual({ complexity: 15, lines: 200 });
  });

  it("funções vêm ordenadas por complexidade decrescente", () => {
    const src = "function a() { return 1; }\nfunction b(x, y) { return x && y; }";
    expect(analyzeFile("lib/x.ts", src).functions.map((f) => f.name)).toEqual(["b", "a"]);
  });
});
