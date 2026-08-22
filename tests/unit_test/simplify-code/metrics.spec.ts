import { describe, expect, it } from "vitest";
import { countLogicalLines, functionComplexities } from "@/tools/simplify-code/metrics.mjs";

describe("countLogicalLines", () => {
  it("conta apenas linhas com código", () => {
    const src = "const a = 1;\nconst b = 2;\n";
    expect(countLogicalLines(src)).toBe(2);
  });

  it("ignora linhas em branco", () => {
    const src = "const a = 1;\n\n\nconst b = 2;\n";
    expect(countLogicalLines(src)).toBe(2);
  });

  it("ignora comentários de linha", () => {
    const src = "const a = 1;\n// comentário\nconst b = 2;\n";
    expect(countLogicalLines(src)).toBe(2);
  });

  it("ignora comentários de bloco multi-linha", () => {
    const src = "/* bloco\n   de\n   comentário */\nconst a = 1;\n";
    expect(countLogicalLines(src)).toBe(1);
  });

  it("não confunde // dentro de string com comentário", () => {
    const src = 'const url = "https://exemplo.com";\n';
    expect(countLogicalLines(src)).toBe(1);
  });

  it("conta a linha de código que tem comentário no fim apenas uma vez", () => {
    const src = "const a = 1; // trailing\n";
    expect(countLogicalLines(src)).toBe(1);
  });

  it("conta todas as linhas de um template literal multi-linha", () => {
    const src = "const t = `linha1\nlinha2`;\n";
    expect(countLogicalLines(src)).toBe(2);
  });

  it("fonte vazia retorna zero", () => {
    expect(countLogicalLines("")).toBe(0);
  });

  it("aceita JSX sem quebrar o parser", () => {
    const src = "const El = () => <div className=\"x\">oi</div>;\n";
    expect(countLogicalLines(src)).toBe(1);
  });
});

describe("functionComplexities", () => {
  const ccDe = (src: string, nome: string) => {
    const found = functionComplexities(src).find((f) => f.name === nome);
    if (!found) throw new Error(`função ${nome} não encontrada`);
    return found.complexity;
  };

  it("função sem desvios tem complexidade 1", () => {
    expect(ccDe("function f() { return 1; }", "f")).toBe(1);
  });

  it("if soma 1", () => {
    expect(ccDe("function f(a) { if (a) return 1; return 2; }", "f")).toBe(2);
  });

  it("else não soma nada além do if", () => {
    expect(ccDe("function f(a) { if (a) { return 1; } else { return 2; } }", "f")).toBe(2);
  });

  it("cada operador && e || soma 1", () => {
    expect(ccDe("function f(a, b, c) { return a && b || c; }", "f")).toBe(3);
  });

  it("?? soma 1 mas ?. não soma", () => {
    expect(ccDe("function f(a) { return a?.b ?? 1; }", "f")).toBe(2);
  });

  it("ternário soma 1", () => {
    expect(ccDe("function f(a) { return a ? 1 : 2; }", "f")).toBe(2);
  });

  it("case soma 1 cada, default não soma", () => {
    const src =
      "function f(a) { switch (a) { case 1: return 1; case 2: return 2; default: return 3; } }";
    expect(ccDe(src, "f")).toBe(3);
  });

  it("loops somam 1 cada", () => {
    const src = "function f(xs) { for (const x of xs) { while (x) { break; } } }";
    expect(ccDe(src, "f")).toBe(3);
  });

  it("catch soma 1, try e finally não somam", () => {
    const src = "function f() { try { g(); } catch (e) { h(); } finally { i(); } }";
    expect(ccDe(src, "f")).toBe(2);
  });

  it("arrow atribuída a const usa o nome da variável", () => {
    const src = "const Componente = (a) => (a ? 1 : 2);";
    expect(ccDe(src, "Componente")).toBe(2);
  });

  it("função aninhada não soma na função pai", () => {
    const src = "function pai(a) { if (a) { return (b) => (b ? 1 : 2); } }";
    expect(ccDe(src, "pai")).toBe(2);
  });

  it("função aninhada anônima aparece como entrada própria", () => {
    const src = "function pai(a) { if (a) { return (b) => (b ? 1 : 2); } }";
    const anon = functionComplexities(src).filter((f) => f.name.startsWith("<anônima>"));
    expect(anon).toHaveLength(1);
    expect(anon[0].complexity).toBe(2);
  });

  it("método de classe é contado", () => {
    const src = "class C { m(a) { return a ? 1 : 2; } }";
    expect(ccDe(src, "C.m")).toBe(2);
  });

  it("reporta a linha de início (1-based) de cada função", () => {
    const src = "\n\nfunction f() { return 1; }";
    expect(functionComplexities(src).find((x) => x.name === "f")?.line).toBe(3);
  });

  it("fonte sem funções retorna lista vazia", () => {
    expect(functionComplexities("const a = 1;")).toEqual([]);
  });
});
