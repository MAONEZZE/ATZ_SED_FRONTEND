import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const SCRIPT = path.join(RAIZ, "tools", "simplify-code", "scan.mjs");

function rodar(args: string[] = []) {
  const saida = execFileSync("node", [SCRIPT, "--json", ...args], {
    cwd: RAIZ,
    encoding: "utf8",
  });
  return JSON.parse(saida);
}

describe("scan.mjs — contrato de saída", () => {
  const relatorio = rodar();

  it("declara os limiares usados", () => {
    expect(relatorio.thresholds).toEqual({ complexity: 15, lines: 200 });
  });

  it("informa a raiz do projeto analisado", () => {
    expect(relatorio.projectRoot).toBe(RAIZ);
  });

  it("resume totais coerentes com as listas", () => {
    expect(relatorio.summary.totalFiles).toBeGreaterThan(50);
    expect(relatorio.summary.candidates).toBe(relatorio.candidates.length);
    expect(relatorio.summary.clones).toBe(relatorio.clones.length);
  });

  it("todo candidato traz motivo e métricas", () => {
    for (const c of relatorio.candidates) {
      expect(c.reasons.length).toBeGreaterThan(0);
      expect(typeof c.logicalLines).toBe("number");
      expect(typeof c.maxComplexity).toBe("number");
    }
  });

  it("candidatos vêm ordenados por complexidade decrescente", () => {
    const ccs = relatorio.candidates.map((c: { maxComplexity: number }) => c.maxComplexity);
    expect([...ccs].sort((a, b) => b - a)).toEqual(ccs);
  });

  it("não inclui wrappers shadcn/ui nem testes", () => {
    const arquivos = relatorio.candidates.map((c: { file: string }) => c.file);
    expect(arquivos.some((f: string) => f.startsWith("components/ui/"))).toBe(false);
    expect(arquivos.some((f: string) => f.includes(".spec."))).toBe(false);
  });

  it("não emite campos de julgamento — isso é trabalho do agente", () => {
    for (const c of relatorio.candidates) {
      expect(c).not.toHaveProperty("effort");
      expect(c).not.toHaveProperty("priority");
      expect(c).not.toHaveProperty("approach");
    }
  });

  it(
    "aceita limiares por flag",
    () => {
      const r = rodar(["--max-complexity", "1", "--max-lines", "1"]);
      expect(r.thresholds).toEqual({ complexity: 1, lines: 1 });
      expect(r.summary.candidates).toBeGreaterThan(relatorio.summary.candidates);
    },
    20_000, // escaneia o repo inteiro via subprocesso; sob suíte cheia em paralelo, 5s não basta
  );

  it("marca se existe arquivo de teste conhecido para o candidato", () => {
    for (const c of relatorio.candidates) {
      expect(typeof c.testExists).toBe("boolean");
    }
  });
});

describe("scan.mjs — escrita em disco", () => {
  it(
    "--out grava o JSON no caminho pedido",
    () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simplify-"));
      const destino = path.join(dir, "saida.json");
      execFileSync("node", [SCRIPT, "--out", destino], { cwd: RAIZ, encoding: "utf8" });
      const gravado = JSON.parse(fs.readFileSync(destino, "utf8"));
      expect(gravado.summary.totalFiles).toBeGreaterThan(50);
      fs.rmSync(dir, { recursive: true, force: true });
    },
    20_000,
  );
});

describe("scan.mjs — portabilidade", () => {
  it("falha com mensagem clara quando roda fora de um projeto com typescript", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sem-ts-"));
    fs.writeFileSync(path.join(dir, "package.json"), "{}");
    let erro = "";
    try {
      execFileSync("node", [SCRIPT, "--json"], { cwd: dir, encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      erro = String((e as { stderr?: string }).stderr ?? "");
    }
    expect(erro).toContain("typescript");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
