#!/usr/bin/env node
// Fase 1 do /simplify-code: mede. Não opina.
// Julgamento (esforço, prioridade, abordagem) é trabalho do agente na fase 2.
import fs from "node:fs";
import path from "node:path";
import { analyzeFile, DEFAULT_THRESHOLDS } from "./metrics.mjs";
import { discoverFiles } from "./discover.mjs";
import { findClones } from "./clones.mjs";

function parseArgs(argv) {
  const args = { json: false, out: null, thresholds: { ...DEFAULT_THRESHOLDS } };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--json") args.json = true;
    else if (flag === "--out") args.out = argv[++i];
    else if (flag === "--max-complexity") args.thresholds.complexity = Number(argv[++i]);
    else if (flag === "--max-lines") args.thresholds.lines = Number(argv[++i]);
    else if (flag === "--help" || flag === "-h") args.help = true;
  }
  return args;
}

const HELP = `
Uso: node scan.mjs [opções]

  --out <caminho>          grava o JSON no arquivo (default: stdout)
  --json                   força JSON puro no stdout (sem resumo legível)
  --max-complexity <n>     limiar de complexidade ciclomática (default: 15)
  --max-lines <n>          limiar de linhas lógicas (default: 200)
  -h, --help               esta ajuda

Roda a partir da raiz do projeto a ser analisado.
`.trim();

// Este repo não espelha o caminho do fonte em tests/ — usa pastas temáticas.
// Então procuramos pelo basename, que é o que dá pra afirmar com honestidade.
function findTestFile(root, sourceFile) {
  const base = path.basename(sourceFile).replace(/\.tsx?$/, "");
  const roots = ["tests/unit_test", "tests/integration_test"];
  const hits = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.name === `${base}.spec.ts` || e.name === `${base}.spec.tsx`) {
        hits.push(path.relative(root, abs).split(path.sep).join("/"));
      }
    }
  };
  for (const r of roots) walk(path.join(root, r));
  return hits[0] ?? null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const root = process.cwd();
  const files = discoverFiles(root);
  const sources = files.map((file) => ({
    file,
    source: fs.readFileSync(path.join(root, file), "utf8"),
  }));

  const analyses = sources.map(({ file, source }) =>
    analyzeFile(file, source, args.thresholds),
  );

  const candidates = analyses
    .filter((a) => a.candidate)
    .sort((a, b) => b.maxComplexity - a.maxComplexity)
    .map((a) => {
      const testFile = findTestFile(root, a.file);
      return {
        file: a.file,
        logicalLines: a.logicalLines,
        maxComplexity: a.maxComplexity,
        totalComplexity: a.totalComplexity,
        reasons: a.reasons,
        // só as 5 piores: a cauda longa de CC 1-2 não ajuda ninguém
        hotFunctions: a.functions.slice(0, 5),
        testFile,
        testExists: testFile !== null,
      };
    });

  const clones = findClones(sources);

  const report = {
    // sem timestamp: mantém a saída determinística e diffável entre execuções
    projectRoot: root,
    thresholds: args.thresholds,
    summary: {
      totalFiles: files.length,
      candidates: candidates.length,
      clones: clones.length,
    },
    candidates,
    clones,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, json);
    if (!args.json) {
      console.log(
        `${files.length} arquivos analisados · ${candidates.length} candidatos · ` +
          `${clones.length} clones\nEscrito em ${args.out}`,
      );
    }
    return;
  }

  process.stdout.write(json);
}

main();
