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

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor,
]);

const DECISION_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.CaseClause, // DefaultClause fica de fora de propósito
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
]);

const DECISION_OPERATORS = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

function isDecisionPoint(node) {
  if (DECISION_KINDS.has(node.kind)) return true;
  return (
    ts.isBinaryExpression(node) && DECISION_OPERATORS.has(node.operatorToken.kind)
  );
}

/**
 * Deriva um nome legível. Arrow/expression pegam o nome do pai (const X = ..., prop: ...).
 * Método vira "Classe.metodo". Sem nome possível, "<anônima>@<linha>".
 */
function functionName(node, sf) {
  const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  if (node.kind === ts.SyntaxKind.Constructor) {
    const cls = node.parent?.name?.getText(sf) ?? "<anônima>";
    return `${cls}.constructor`;
  }
  if (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node)
  ) {
    const cls = ts.isClassLike(node.parent) ? node.parent.name?.getText(sf) : null;
    const own = node.name?.getText(sf) ?? `<anônima>@${line}`;
    return cls ? `${cls}.${own}` : own;
  }
  if (node.name) return node.name.getText(sf);

  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && parent.name) {
    return parent.name.getText(sf);
  }
  if (parent && ts.isPropertyAssignment(parent) && parent.name) {
    return parent.name.getText(sf);
  }
  return `<anônima>@${line}`;
}

/**
 * Complexidade ciclomática por função, exclusiva de funções aninhadas.
 * @param {string} source
 * @param {string} [fileName]
 * @returns {Array<{name: string, line: number, complexity: number}>}
 */
export function functionComplexities(source, fileName = "arquivo.tsx") {
  const sf = parse(source, fileName);
  const results = [];

  const measure = (fnNode) => {
    let complexity = 1;
    const walk = (node) => {
      // para na fronteira da função aninhada: ela tem entrada própria
      if (node !== fnNode && FUNCTION_KINDS.has(node.kind)) return;
      if (node !== fnNode && isDecisionPoint(node)) complexity += 1;
      node.forEachChild(walk);
    };
    walk(fnNode);
    results.push({
      name: functionName(fnNode, sf),
      line: sf.getLineAndCharacterOfPosition(fnNode.getStart(sf)).line + 1,
      complexity,
    });
  };

  const collect = (node) => {
    if (FUNCTION_KINDS.has(node.kind)) measure(node);
    node.forEachChild(collect);
  };
  sf.forEachChild(collect);

  return results;
}

// Limiares do spec: CC > 15 OU linhas lógicas > 200.
export const DEFAULT_THRESHOLDS = { complexity: 15, lines: 200 };

/**
 * @param {string} file caminho relativo à raiz do projeto
 * @param {string} source
 * @param {{complexity: number, lines: number}} [thresholds]
 */
export function analyzeFile(file, source, thresholds = DEFAULT_THRESHOLDS) {
  const functions = functionComplexities(source, file).sort(
    (a, b) => b.complexity - a.complexity,
  );
  const logicalLines = countLogicalLines(source);
  const maxComplexity = functions.length
    ? Math.max(...functions.map((f) => f.complexity))
    : 0;
  const totalComplexity = functions.reduce((sum, f) => sum + f.complexity, 0);

  const reasons = [];
  if (maxComplexity > thresholds.complexity) reasons.push("complexity");
  if (logicalLines > thresholds.lines) reasons.push("size");

  return {
    file,
    logicalLines,
    maxComplexity,
    totalComplexity,
    functions,
    candidate: reasons.length > 0,
    reasons,
  };
}

export { parse, ts };
