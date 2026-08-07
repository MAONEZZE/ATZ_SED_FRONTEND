import { describe, expect, it } from "vitest";
import { countLogicalLines } from "@/tools/simplify-code/metrics.mjs";

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
