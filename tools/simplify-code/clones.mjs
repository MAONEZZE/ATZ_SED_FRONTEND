import crypto from "node:crypto";
import { countLogicalLines, parse, ts } from "./metrics.mjs";

// 16 linhas lógicas: abaixo disso "duplicação" costuma ser boilerplate honesto
// (imports, guard clause) e o ruído afoga o sinal. O spec pedia 50, que não
// acha nada num codebase com média de ~100 linhas por arquivo.
export const DEFAULT_MIN_LINES = 16;

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
]);

/**
 * Assinatura estrutural: a sequência de tipos de token do corpo.
 * Identificadores e literais viram só o seu kind, então renomear variável
 * não escapa da detecção — mudar a lógica, sim.
 */
function structuralHash(node, sf) {
  const kinds = [];
  const walk = (n) => {
    const children = n.getChildren(sf);
    if (children.length === 0) {
      if (n.kind !== ts.SyntaxKind.EndOfFileToken) kinds.push(n.kind);
      return;
    }
    for (const c of children) walk(c);
  };
  walk(node);
  return crypto.createHash("sha1").update(kinds.join(",")).digest("hex");
}

/**
 * @param {Array<{file: string, source: string}>} files
 * @param {{minLines?: number}} [options]
 * @returns {Array<{id: string, logicalLines: number, occurrences: Array<{file: string, line: number}>}>}
 */
export function findClones(files, options = {}) {
  const minLines = options.minLines ?? DEFAULT_MIN_LINES;
  const buckets = new Map();

  for (const { file, source } of files) {
    const sf = parse(source, file);
    const visit = (node) => {
      if (FUNCTION_KINDS.has(node.kind) && node.body) {
        const text = node.body.getText(sf);
        const lines = countLogicalLines(text);
        if (lines >= minLines) {
          const key = structuralHash(node.body, sf);
          if (!buckets.has(key)) buckets.set(key, { logicalLines: lines, occurrences: [] });
          buckets.get(key).occurrences.push({
            file,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          });
        }
      }
      node.forEachChild(visit);
    };
    sf.forEachChild(visit);
  }

  const clones = [];
  let n = 1;
  for (const bucket of buckets.values()) {
    if (bucket.occurrences.length < 2) continue;
    clones.push({
      id: `dup-${String(n++).padStart(3, "0")}`,
      logicalLines: bucket.logicalLines,
      occurrences: bucket.occurrences,
    });
  }
  // maior duplicação primeiro: é a que mais paga refatorar
  return clones.sort((a, b) => b.logicalLines - a.logicalLines);
}
