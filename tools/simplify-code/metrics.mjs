// Métricas de complexidade calculadas via AST do TypeScript.
// Nada aqui adivinha: se não dá pra medir, não é reportado.
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));

/** @type {import("typescript")} */
let ts;
try {
  ts = require("typescript");
} catch {
  throw new Error(
    "simplify-code precisa do pacote `typescript` no node_modules do projeto alvo. " +
      `Rode a partir da raiz de um projeto que o tenha instalado (cwd atual: ${process.cwd()}).`,
  );
}

/**
 * Faz o parse de um fonte TS/TSX. `setParentNodes: true` é obrigatório porque
 * usamos getChildren()/getStart(), que dependem do parent.
 * @param {string} source
 * @param {string} fileName
 */
function parse(source, fileName = "arquivo.tsx") {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
}

/**
 * Conta linhas lógicas: linhas que contêm ao menos um token real.
 * Comentários são trivia no AST, então saem de graça — sem regex, sem
 * falso-positivo com "https://" dentro de string.
 * @param {string} source
 * @returns {number}
 */
export function countLogicalLines(source) {
  const sf = parse(source);
  const lines = new Set();

  const visit = (node) => {
    const children = node.getChildren(sf);
    if (children.length === 0) {
      // token zero-width (SyntaxList vazia, EndOfFileToken) não é código real
      if (node.getStart(sf) === node.getEnd()) return;
      // getStart() pula a trivia à esquerda; getEnd() cobre tokens multi-linha
      // (template literal, string com quebra) — que são linhas de código de fato.
      const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line;
      for (let l = start; l <= end; l++) lines.add(l);
      return;
    }
    for (const child of children) visit(child);
  };

  visit(sf);
  return lines.size;
}

export { parse, ts };
