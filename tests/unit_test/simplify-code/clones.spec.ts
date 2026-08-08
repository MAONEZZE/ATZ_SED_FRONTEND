import { describe, expect, it } from "vitest";
import { findClones } from "@/tools/simplify-code/clones.mjs";

const corpoLongo = (nomeVar: string) =>
  Array.from({ length: 14 }, (_, i) => `  const ${nomeVar}${i} = ${i} + 1;`).join("\n");

describe("findClones", () => {
  it("acha o mesmo corpo em dois arquivos, mesmo com nomes diferentes", () => {
    const clones = findClones([
      { file: "lib/a.ts", source: `function a() {\n${corpoLongo("x")}\n}` },
      { file: "lib/b.ts", source: `function b() {\n${corpoLongo("y")}\n}` },
    ]);
    expect(clones).toHaveLength(1);
    expect(clones[0].occurrences.map((o) => o.file)).toEqual(["lib/a.ts", "lib/b.ts"]);
  });

  it("não acha clone em corpos com lógica diferente", () => {
    const clones = findClones([
      { file: "lib/a.ts", source: `function a() {\n${corpoLongo("x")}\n}` },
      {
        file: "lib/b.ts",
        source: `function b() {\n${corpoLongo("y")}\n  if (y0) return 1;\n}`,
      },
    ]);
    expect(clones).toEqual([]);
  });

  it("ignora funções curtas demais para valer refatoração", () => {
    const clones = findClones([
      { file: "lib/a.ts", source: "function a() { return 1; }" },
      { file: "lib/b.ts", source: "function b() { return 1; }" },
    ]);
    expect(clones).toEqual([]);
  });

  it("respeita minLines customizado", () => {
    const clones = findClones(
      [
        { file: "lib/a.ts", source: "function a() { return 1; }" },
        { file: "lib/b.ts", source: "function b() { return 1; }" },
      ],
      { minLines: 1 },
    );
    expect(clones).toHaveLength(1);
  });

  it("acha clone dentro do mesmo arquivo", () => {
    const src = `function a() {\n${corpoLongo("x")}\n}\nfunction b() {\n${corpoLongo("y")}\n}`;
    const clones = findClones([{ file: "lib/a.ts", source: src }], { minLines: 10 });
    expect(clones).toHaveLength(1);
    expect(clones[0].occurrences).toHaveLength(2);
  });

  it("agrupa três ocorrências em um único clone", () => {
    const clones = findClones([
      { file: "lib/a.ts", source: `function a() {\n${corpoLongo("x")}\n}` },
      { file: "lib/b.ts", source: `function b() {\n${corpoLongo("y")}\n}` },
      { file: "lib/c.ts", source: `function c() {\n${corpoLongo("z")}\n}` },
    ]);
    expect(clones).toHaveLength(1);
    expect(clones[0].occurrences).toHaveLength(3);
  });

  it("reporta as linhas lógicas do bloco duplicado", () => {
    const clones = findClones([
      { file: "lib/a.ts", source: `function a() {\n${corpoLongo("x")}\n}` },
      { file: "lib/b.ts", source: `function b() {\n${corpoLongo("y")}\n}` },
    ]);
    expect(clones[0].logicalLines).toBe(16);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(findClones([])).toEqual([]);
  });
});
