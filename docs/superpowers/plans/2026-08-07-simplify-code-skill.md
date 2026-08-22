# simplify-code Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/simplify-code` skill that scans this codebase for high cyclomatic complexity, oversized files, and copy-paste clones, then produces a prioritized refactoring plan.

**Architecture:** A deterministic Node script computes *facts* (complexity, logical lines, clone hashes) using the TypeScript compiler API that is already installed; an agent reads those facts and authors *judgment* (issues, approaches, priorities). Facts and judgment live in two separate JSON files so a hallucinated number can never masquerade as a measurement. The script is developed inside this repo under TDD with the existing Vitest suite, then copied to `~/.claude/skills/simplify-code/`, with a drift-guard test asserting the two copies stay byte-identical.

**Tech Stack:** Node 23 ESM (`.mjs`, no build step), TypeScript compiler API (`typescript@^5`, already a devDependency), Vitest 3 (already configured), no new dependencies.

---

## Read This First

### Deviations from the design spec

The spec at `docs/superpowers/specs/2026-08-07-complexity-reduction-skill-design.md` is the input to this plan, but four of its claims were checked against the real repo and do not hold. Implement what this plan says, not what the spec says, where they disagree.

| Spec claim | Reality | What we do |
|---|---|---|
| `attendee-detail-sheet.tsx` is 289 lines | It is **128 lines** (`wc -l`) | Ignore the spec's example file list entirely. The script measures; nobody guesses. |
| Phase 1 "Scan" is agent-driven | Agents cannot count reliably — the spec's own line numbers are wrong | Phase 1 is a deterministic script. Agent judgment starts at Phase 2. |
| `duplications[].similarityScore: 0.85` | No similarity engine exists; `jscpd` is not installed | v1 detects **exact structural clones only** (normalized token-sequence hash). No fabricated similarity floats. Near-miss clone detection is explicitly out of scope. |
| `/execute-refactor` auto-applies refactorings | Second skill, large blast radius | Out of scope for v1. The generated plan is handed to the existing `superpowers:executing-plans` flow. |

### Facts about this repo the implementer must not rediscover the hard way

- **Vitest only discovers `tests/unit_test/**/*.spec.{ts,tsx}` and `tests/integration_test/**/*.spec.{ts,tsx}`.** A `.test.ts` file silently never runs. Every test in this plan is `.spec.ts` under `tests/unit_test/`.
- **`globals` is NOT enabled.** Every test file must start with `import { describe, expect, it } from "vitest";`.
- **There are no setup files, no mocks, no test factories** in this suite. Tests are plain and self-contained. Match that.
- **Test names in this repo are written in Portuguese.** Match that — see `tests/unit_test/utils/dashboard-metrics.spec.ts`.
- **`@/` is an alias for the repo root** (both `tsconfig.json` paths and `vitest.config.ts` resolve.alias). Import source as `@/tools/simplify-code/metrics.mjs` — with the explicit `.mjs` extension.
- **`package.json` has no `type` field**, so the project is CommonJS. That is exactly why our scripts use the `.mjs` extension — it forces ESM per-file without touching `package.json`.
- **`docs/` is NOT gitignored** (`.gitignore` line 43 is `.docs/`, dot-prefixed, which does not match). Generated JSON output will appear in `git status`. That is accepted, not a bug.
- Run a single test file with: `npx vitest run tests/unit_test/simplify-code/metrics.spec.ts`

### The `createRequire` trap (read before Task 6)

The script is *copied* to `~/.claude/skills/simplify-code/`, where there is no `node_modules`. A bare `import ts from "typescript"` resolves relative to **the script's own location**, not the working directory — so the installed copy would crash with `ERR_MODULE_NOT_FOUND`.

The fix, used in every module that needs the compiler, is to resolve `typescript` from the **target project's** `node_modules` instead:

```js
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const ts = require("typescript");
```

Task 6 has a test that guards this. Do not "simplify" it back to a static import.

---

## Task 1: Repo scaffolding and the empty metrics module

**Files:**
- Create: `tools/simplify-code/metrics.mjs`
- Create: `tests/unit_test/simplify-code/metrics.spec.ts`

**Step 1: Confirm you are not on `main`**

Run: `git branch --show-current`

Expected: `feature/novo_ui` (or another feature branch). If it prints `main` or `master`, **stop and ask the user** before writing anything.

**Step 2: Confirm the TypeScript compiler is importable**

Run:
```bash
node -e "const ts=require('typescript'); console.log(ts.version)"
```
Expected: a version string starting with `5.` (e.g. `5.9.3`). If this fails, **stop** — the whole plan depends on it.

**Step 3: Write the failing test**

Create `tests/unit_test/simplify-code/metrics.spec.ts`:

```ts
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
```

**Step 4: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/metrics.spec.ts`

Expected: FAIL — `Failed to resolve import "@/tools/simplify-code/metrics.mjs"`.

**Step 5: Write the minimal implementation**

Create `tools/simplify-code/metrics.mjs`:

```js
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
      if (node.kind === ts.SyntaxKind.EndOfFileToken) return;
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
```

**Step 6: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/metrics.spec.ts`

Expected: PASS — 9 passed.

**Step 7: Confirm the whole suite is still green**

Run: `npm test`

Expected: all files pass. If a pre-existing test was already failing before your change, note it and move on — do not fix unrelated failures inside this plan.

**Step 8: Commit**

```bash
git add tools/simplify-code/metrics.mjs tests/unit_test/simplify-code/metrics.spec.ts
git commit -m "feat(simplify-code): add AST-based logical line counter"
```

---

## Task 2: Cyclomatic complexity per function

Cyclomatic complexity counts decision points, starting from 1. The rule we implement, stated precisely so the tests are unambiguous:

- Every function-like node gets its **own** entry.
- A function's CC is **exclusive** of its nested functions — decision points inside a nested arrow belong to that arrow, not to the parent. This is the textbook definition and it keeps the numbers additive.
- Counted as +1 each: `if`, ternary `? :`, `case` clause (but **not** `default`), `for`, `for..in`, `for..of`, `while`, `do..while`, `catch`, and the binary operators `&&`, `||`, `??`.
- **Not** counted: `else` (it adds no new path beyond its `if`), `default:`, optional chaining `?.`, `try`, `finally`.

**Files:**
- Modify: `tools/simplify-code/metrics.mjs`
- Modify: `tests/unit_test/simplify-code/metrics.spec.ts`

**Step 1: Write the failing test**

Append to `tests/unit_test/simplify-code/metrics.spec.ts` (and add `functionComplexities` to the import on line 2):

```ts
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
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/metrics.spec.ts`

Expected: FAIL — `functionComplexities is not exported` / `is not a function`.

**Step 3: Write the minimal implementation**

Append to `tools/simplify-code/metrics.mjs`:

```js
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
```

**Step 4: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/metrics.spec.ts`

Expected: PASS — 24 passed (9 from Task 1 + 15 new).

**Step 5: Commit**

```bash
git add tools/simplify-code/metrics.mjs tests/unit_test/simplify-code/metrics.spec.ts
git commit -m "feat(simplify-code): add per-function cyclomatic complexity"
```

---

## Task 3: File-level analysis

Combines the two metrics into one per-file record and decides whether the file is a candidate.

**Files:**
- Modify: `tools/simplify-code/metrics.mjs`
- Create: `tests/unit_test/simplify-code/analyze-file.spec.ts`

**Step 1: Write the failing test**

Create `tests/unit_test/simplify-code/analyze-file.spec.ts`:

```ts
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
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/analyze-file.spec.ts`

Expected: FAIL — `analyzeFile is not a function`.

**Step 3: Write the minimal implementation**

Append to `tools/simplify-code/metrics.mjs`:

```js
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
```

**Step 4: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/`

Expected: PASS — 34 passed.

**Step 5: Commit**

```bash
git add tools/simplify-code/metrics.mjs tests/unit_test/simplify-code/analyze-file.spec.ts
git commit -m "feat(simplify-code): add per-file analysis with candidate thresholds"
```

---

## Task 4: File discovery and exclusions

The spec's scope: `components/**`, `lib/**`, `hooks/**`, `app/**`. Excluded: `node_modules`, tests, shadcn/ui wrappers (`components/ui/**`), and generated files.

> **Note on `components/ui/**`:** the spec says to exclude shadcn wrappers because they are vendored. But `git status` shows 11 of them are locally modified in this branch. We still exclude them — a vendored file that was tweaked is not ours to restructure — and the skill's README says so out loud.

**Files:**
- Create: `tools/simplify-code/discover.mjs`
- Create: `tests/unit_test/simplify-code/discover.spec.ts`

**Step 1: Write the failing test**

Create `tests/unit_test/simplify-code/discover.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isInScope, SCOPE_DIRS } from "@/tools/simplify-code/discover.mjs";

describe("isInScope", () => {
  it("aceita componente tsx", () => {
    expect(isInScope("components/events/event-form-fields.tsx")).toBe(true);
  });

  it("aceita util em lib", () => {
    expect(isInScope("lib/utils/dashboard-metrics.ts")).toBe(true);
  });

  it("aceita hook", () => {
    expect(isInScope("hooks/use-sidebar-state.ts")).toBe(true);
  });

  it("aceita página em app com rota entre parênteses", () => {
    expect(isInScope("app/(dashboard)/events/page.tsx")).toBe(true);
  });

  it("recusa node_modules", () => {
    expect(isInScope("node_modules/react/index.js")).toBe(false);
  });

  it("recusa diretório fora do escopo", () => {
    expect(isInScope("scripts/build.ts")).toBe(false);
  });

  it("recusa wrappers shadcn/ui", () => {
    expect(isInScope("components/ui/button.tsx")).toBe(false);
  });

  it("recusa arquivos de teste", () => {
    expect(isInScope("tests/unit_test/utils/x.spec.ts")).toBe(false);
    expect(isInScope("components/x.spec.tsx")).toBe(false);
  });

  it("recusa arquivos de declaração .d.ts", () => {
    expect(isInScope("lib/api/types.d.ts")).toBe(false);
  });

  it("recusa extensão não-TypeScript", () => {
    expect(isInScope("app/globals.css")).toBe(false);
    expect(isInScope("lib/legado.js")).toBe(false);
  });

  it("normaliza separador do Windows", () => {
    expect(isInScope("components\\events\\form.tsx")).toBe(true);
  });

  it("SCOPE_DIRS bate com o spec", () => {
    expect(SCOPE_DIRS).toEqual(["app", "components", "hooks", "lib"]);
  });
});

describe("isInScope — arquivos gerados", () => {
  it("recusa fonte marcada com @generated", () => {
    expect(isInScope("lib/api/types.ts", "// @generated por script\nexport type T = 1;")).toBe(
      false,
    );
  });

  it("aceita fonte sem a marca", () => {
    expect(isInScope("lib/api/types.ts", "export type T = 1;")).toBe(true);
  });

  it("só olha o topo do arquivo para a marca @generated", () => {
    const tarde = `${"const a = 1;\n".repeat(50)}// @generated\n`;
    expect(isInScope("lib/x.ts", tarde)).toBe(true);
  });
});
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/discover.spec.ts`

Expected: FAIL — cannot resolve `@/tools/simplify-code/discover.mjs`.

**Step 3: Write the minimal implementation**

Create `tools/simplify-code/discover.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

export const SCOPE_DIRS = ["app", "components", "hooks", "lib"];

const EXCLUDED_PREFIXES = [
  "node_modules/",
  "components/ui/", // wrappers shadcn/ui: código vendorizado, não refatoramos
  "tests/",
];

// Só as primeiras linhas contam: um "@generated" no meio do arquivo é comentário comum.
const GENERATED_HEADER_LINES = 5;

/**
 * @param {string} filePath caminho relativo à raiz do projeto
 * @param {string} [source] conteúdo, se já lido — habilita a checagem de @generated
 * @returns {boolean}
 */
export function isInScope(filePath, source) {
  const rel = filePath.split(path.win32.sep).join("/");

  if (EXCLUDED_PREFIXES.some((p) => rel.startsWith(p) || rel.includes(`/${p}`))) {
    return false;
  }
  if (!SCOPE_DIRS.includes(rel.split("/")[0])) return false;
  if (!/\.(ts|tsx)$/.test(rel)) return false;
  if (rel.endsWith(".d.ts")) return false;
  if (/\.(spec|test)\.tsx?$/.test(rel)) return false;

  if (source !== undefined) {
    const header = source.split("\n").slice(0, GENERATED_HEADER_LINES).join("\n");
    if (header.includes("@generated")) return false;
  }

  return true;
}

/**
 * Lista recursivamente os arquivos em escopo sob `root`.
 * @param {string} root raiz do projeto
 * @returns {string[]} caminhos relativos, ordenados
 */
export function discoverFiles(root) {
  const found = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // diretório de escopo ausente é normal (nem todo projeto tem hooks/)
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(abs);
      } else if (isInScope(rel)) {
        found.push(rel);
      }
    }
  };

  for (const dir of SCOPE_DIRS) walk(path.join(root, dir));
  return found.sort();
}
```

**Step 4: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/discover.spec.ts`

Expected: PASS — 15 passed.

**Step 5: Sanity-check discovery against the real repo**

Run:
```bash
node -e "import('./tools/simplify-code/discover.mjs').then(m=>{const f=m.discoverFiles(process.cwd());console.log(f.length);console.log(f.slice(0,5).join('\n'))})"
```

Expected: a count somewhere near **110–125** (136 total `.ts`/`.tsx` files in scope dirs, minus ~15 `components/ui/**` wrappers and any `.d.ts`), followed by five `app/...` paths. If it prints `0`, discovery is broken — stop and debug before continuing.

**Step 6: Commit**

```bash
git add tools/simplify-code/discover.mjs tests/unit_test/simplify-code/discover.spec.ts
git commit -m "feat(simplify-code): add scoped file discovery with exclusions"
```

---

## Task 5: Exact structural clone detection

Detects copy-paste: functions whose **token-kind sequence** is identical after identifiers and literals are normalized away. Renamed variables still match; genuinely different logic does not.

This deliberately does not compute a similarity score. Near-miss clones are out of scope for v1 — see the deviations table.

**Files:**
- Create: `tools/simplify-code/clones.mjs`
- Create: `tests/unit_test/simplify-code/clones.spec.ts`

**Step 1: Write the failing test**

Create `tests/unit_test/simplify-code/clones.spec.ts`:

```ts
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
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/clones.spec.ts`

Expected: FAIL — cannot resolve `@/tools/simplify-code/clones.mjs`.

**Step 3: Write the minimal implementation**

Create `tools/simplify-code/clones.mjs`:

```js
import crypto from "node:crypto";
import { countLogicalLines, parse, ts } from "./metrics.mjs";

// 20 linhas lógicas: abaixo disso "duplicação" costuma ser boilerplate honesto
// (imports, guard clause) e o ruído afoga o sinal. O spec pedia 50, que não
// acha nada num codebase com média de ~100 linhas por arquivo.
export const DEFAULT_MIN_LINES = 20;

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
```

**Step 4: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/clones.spec.ts`

Expected: PASS — 8 passed.

If the `logicalLines` assertion in the seventh test fails with a number other than 16, **do not change the implementation to match** — read the generated source, count the braces plus 14 body lines yourself, and correct the expectation in the test. The `corpoLongo` helper produces 14 lines; the function body adds `{` and `}`.

**Step 5: Commit**

```bash
git add tools/simplify-code/clones.mjs tests/unit_test/simplify-code/clones.spec.ts
git commit -m "feat(simplify-code): add exact structural clone detection"
```

---

## Task 6: The `scan.mjs` CLI

Ties everything together and emits the **facts** JSON. This file contains no judgment — no `effort`, no `priority`, no `approach`. Those are the agent's job in Task 8.

**Files:**
- Create: `tools/simplify-code/scan.mjs`
- Create: `tests/unit_test/simplify-code/scan.spec.ts`

**Step 1: Write the failing test**

Create `tests/unit_test/simplify-code/scan.spec.ts`:

```ts
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

  it("aceita limiares por flag", () => {
    const r = rodar(["--max-complexity", "1", "--max-lines", "1"]);
    expect(r.thresholds).toEqual({ complexity: 1, lines: 1 });
    expect(r.summary.candidates).toBeGreaterThan(relatorio.summary.candidates);
  });

  it("marca se existe arquivo de teste conhecido para o candidato", () => {
    for (const c of relatorio.candidates) {
      expect(typeof c.testExists).toBe("boolean");
    }
  });
});

describe("scan.mjs — escrita em disco", () => {
  it("--out grava o JSON no caminho pedido", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simplify-"));
    const destino = path.join(dir, "saida.json");
    execFileSync("node", [SCRIPT, "--out", destino], { cwd: RAIZ, encoding: "utf8" });
    const gravado = JSON.parse(fs.readFileSync(destino, "utf8"));
    expect(gravado.summary.totalFiles).toBeGreaterThan(50);
    fs.rmSync(dir, { recursive: true, force: true });
  });
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
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/scan.spec.ts`

Expected: FAIL — `ENOENT` / `Cannot find module .../scan.mjs`.

**Step 3: Write the minimal implementation**

Create `tools/simplify-code/scan.mjs`:

```js
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
```

**Step 4: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/scan.spec.ts`

Expected: PASS — 11 passed.

If the "falha com mensagem clara" test fails, the `createRequire` guard in `metrics.mjs` is not doing its job — re-read the trap section at the top of this plan.

**Step 5: Look at the real output with your own eyes**

Run:
```bash
node tools/simplify-code/scan.mjs --json | head -40
```

Expected: valid JSON where `summary.totalFiles` is ~110–125. Then spot-check one number by hand:

```bash
node tools/simplify-code/scan.mjs --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.candidates.slice(0,5).map(c=>`${c.maxComplexity}\t${c.logicalLines}\t${c.file}`).join('\n'))})"
```

Sanity check: `components/messages/send-message-form.tsx` (632 raw lines) should appear as a candidate. If it does not, something is wrong — investigate before continuing.

**Step 6: Run the full suite**

Run: `npm test`

Expected: green.

**Step 7: Commit**

```bash
git add tools/simplify-code/scan.mjs tests/unit_test/simplify-code/scan.spec.ts
git commit -m "feat(simplify-code): add scan CLI emitting metrics report"
```

---

## Task 7: Write SKILL.md and README.md

**REQUIRED SUB-SKILL:** Use `superpowers:writing-skills` for this task. Its Iron Law — *no skill without a failing test first* — applies: Step 1 below is that baseline.

Conventions confirmed on disk that you must match:
- Frontmatter carries only `name` and `description` (plus `trigger:`, which `graphify` uses and this skill will too). Max 1024 chars.
- `description` is third person, starts with "Use when…", describes **triggering conditions only** — never the workflow.
- **The description must disambiguate from the built-in `simplify` and `code-review` skills**, which otherwise match the same words. `simplify` applies fixes to a diff; this one analyzes a whole codebase and only writes a report.
- 14 of 17 of this user's skills ship a `README.md` in Portuguese with exactly these five headings: `## O que faz`, `## Quando usar`, `## Quando NÃO usar`, `## Exemplo`, `## Requisitos`.

**Files:**
- Create: `tools/simplify-code/SKILL.md`
- Create: `tools/simplify-code/README.md`

> Author both **in the repo** so they are version-controlled. Task 8 installs them.

**Step 1: Establish the RED baseline**

Before writing the skill, dispatch a subagent with the Agent tool (`subagent_type: "general-purpose"`) and this exact prompt:

> In the repo at `/home/sanchezz/Desktop/ATZ/SED (save event date)/ATZ_SED_FRONTEND`, produce a prioritized refactoring plan for the most complex files. Report which files you picked, the cyclomatic complexity of each, and how you determined it.

Record its answer. Expect it to eyeball files and state complexity numbers it cannot have computed — that is the failure the skill exists to prevent. Save the transcript summary to `tools/simplify-code/BASELINE.md` with a one-line note on what it got wrong.

**Step 2: Write `tools/simplify-code/SKILL.md`**

```markdown
---
name: simplify-code
description: "Use when asked to analyze a whole codebase for complexity, oversized files, duplicated code, or technical debt, and to produce a prioritized refactoring plan. For scanning and reporting across many files - not for applying fixes to a diff (that is /simplify) or reviewing changes for bugs (that is /code-review)."
trigger: /simplify-code
---

# /simplify-code

## Usage

```
/simplify-code                       # escaneia com os limiares padrão (CC 15, 200 linhas)
/simplify-code --max-complexity 10   # limiar de complexidade mais rígido
/simplify-code --max-lines 150       # limiar de tamanho mais rígido
```

## What simplify-code is for

Achar código difícil de manter e propor um plano de refatoração priorizado.
Legibilidade e remoção de duplicação — **nunca** mudança de comportamento.

Duas fases, com uma fronteira dura entre elas:

| Fase | Quem faz | Sai o quê |
|---|---|---|
| 1. Medir | `scan.mjs` (determinístico, AST do TypeScript) | fatos: CC, linhas lógicas, clones |
| 2. Julgar | você, o agente | opinião: problemas, abordagem, esforço, prioridade |

**Você nunca inventa um número.** Toda métrica citada no plano vem do JSON da
fase 1. Se o script não mediu, o plano não afirma.

## What You Must Do When Invoked

Siga na ordem. Não pule etapas.

### Step 1 - Rode o scan

A partir da raiz do projeto alvo:

```bash
node tools/simplify-code/scan.mjs --out "docs/superpowers/refactoring/$(date +%Y-%m-%d)-metrics.json"
```

O script precisa do pacote `typescript` no `node_modules` do projeto alvo.
Se ele falhar por isso, pare e diga ao usuário — não tente estimar na mão.

### Step 2 - Leia o JSON de métricas

Campos: `candidates[]` (com `file`, `logicalLines`, `maxComplexity`,
`totalComplexity`, `reasons`, `hotFunctions`, `testFile`, `testExists`) e
`clones[]` (com `logicalLines` e `occurrences`).

Se `summary.candidates` for 0, diga isso e pare. Um codebase limpo é um
resultado válido; não baixe o limiar para fabricar trabalho.

### Step 3 - Leia os arquivos candidatos

Leia por completo os candidatos do topo (até 8). Para cada um, identifique:

- **Legibilidade** — condicionais aninhadas, nomes crípticos, abstração ausente
- **Duplicação** — trechos repetidos, dentro do arquivo e entre arquivos
- **Concerns misturados** — lógica de form + render + validação no mesmo arquivo

Confira os `clones[]` do JSON contra o que você leu: o script acha só clone
estrutural exato, então duplicação parecida-mas-não-idêntica é achado seu.

### Step 4 - Escreva o plano

Grave em `docs/superpowers/refactoring/YYYY-MM-DD-complexity-analysis.json`:

```json
{
  "metricsFile": "docs/superpowers/refactoring/YYYY-MM-DD-metrics.json",
  "refactorings": [
    {
      "id": "ref-001",
      "file": "components/messages/send-message-form.tsx",
      "metrics": { "maxComplexity": 18, "logicalLines": 632 },
      "issues": ["..."],
      "approach": { "type": "extract-function", "steps": ["..."] },
      "effort": "medium",
      "priority": 1,
      "testFile": "tests/unit_test/messages/send-message.spec.ts",
      "testExists": true,
      "testStrategy": ["..."]
    }
  ],
  "duplications": []
}
```

Regras para preencher:

- `metrics` é **copiado** do JSON da fase 1. Nunca recalculado de cabeça.
- `priority`: 1 é o mais alto. Ordene por (impacto na manutenção) ÷ (risco).
  Arquivo sem teste é risco alto — desça a prioridade dele, não suba.
- `effort`: `low` | `medium` | `high`. Sem estimativa em horas — você não sabe.
- `testExists: false` obriga um passo explícito de "escrever teste de
  caracterização antes de mexer" dentro de `testStrategy`.

### Step 5 - Resuma no terminal

Uma tabela: arquivo, CC, linhas, prioridade, tem teste. Depois o caminho dos
dois JSONs. Diga ao usuário que executar o plano é um passo separado, via
`superpowers:executing-plans`.

## Safety Constraints

- **Sem mudança de fluxo.** Refatoração preserva comportamento observável.
- **Exports intactos.** Assinatura pública não muda.
- **Um commit por refatoração**, para reverter barato.
- **Teste é portão.** Teste vermelho para a execução; não siga no escuro.
- **Este skill não edita código.** Ele só escreve os dois JSONs de relatório.

## Honesty Rules

- Não cite complexidade que não veio do `scan.mjs`.
- Não invente `similarityScore` — o detector acha clone exato, e só.
- `hotFunctions` traz as 5 piores por arquivo, não todas. Não afirme cobertura
  total do arquivo com base nelas.
- Se você leu só 8 dos candidatos, diga quantos ficaram de fora.
- `testExists` é casado por nome de arquivo. Um `true` significa "existe um
  .spec com esse nome", não "esse arquivo está bem coberto".
```

**Step 3: Write `tools/simplify-code/README.md`**

Match the house format exactly — five headings, Portuguese, same voice as `~/.claude/skills/brainstorming/README.md`:

```markdown
## O que faz
Escaneia o codebase inteiro medindo complexidade ciclomática, linhas lógicas e código duplicado via AST do TypeScript. Depois lê os piores arquivos e escreve um plano de refatoração priorizado. Mede primeiro, opina depois — nenhum número do relatório é chutado.

## Quando usar
- O codebase acumulou arquivos grandes e difíceis de mexer
- Você suspeita de copy-paste mas não sabe onde
- Antes de um ciclo de refatoração, pra decidir por onde começar
- Quer uma linha de base de complexidade pra acompanhar no tempo

## Quando NÃO usar
- Quer corrigir o diff atual → use `/simplify`
- Quer achar bugs numa mudança → use `/code-review`
- O projeto não tem `typescript` no node_modules → o scan não roda
- Quer que alguém aplique as refatorações → isto só gera o plano

## Exemplo
`/simplify-code` → scan mede 118 arquivos → 6 candidatos acima do limiar → agente lê os 6 → escreve `docs/superpowers/refactoring/2026-08-07-complexity-analysis.json` com 6 refatorações priorizadas e 2 duplicações → você executa com `superpowers:executing-plans`

## Requisitos
Node 18+ e o pacote `typescript` instalado no projeto alvo (o scan usa o compilador dele). Wrappers shadcn/ui em `components/ui/` e arquivos de teste ficam fora do escopo por padrão.
```

**Step 4: Verify the skill works (GREEN)**

Dispatch a fresh subagent with the Agent tool, giving it the **same prompt as Step 1** plus one line: `Use the skill at tools/simplify-code/SKILL.md.`

Expected difference from baseline: it runs `scan.mjs`, cites numbers that match the JSON, and names the files the script actually flagged. Diff its cited complexity values against the JSON — **any mismatch is a bug in SKILL.md's honesty rules**, not an acceptable rounding.

Append the result to `tools/simplify-code/BASELINE.md` under a `## GREEN` heading.

**Step 5: Commit**

```bash
git add tools/simplify-code/SKILL.md tools/simplify-code/README.md tools/simplify-code/BASELINE.md
git commit -m "feat(simplify-code): add SKILL.md and README with RED/GREEN baseline"
```

---

## Task 8: Install to `~/.claude/skills/` with a drift guard

Two copies of a file always diverge unless something forbids it. The guard is a test.

**Files:**
- Create: `tools/simplify-code/install.mjs`
- Create: `tests/unit_test/simplify-code/install-drift.spec.ts`

**Step 1: Write the failing test**

Create `tests/unit_test/simplify-code/install-drift.spec.ts`:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INSTALL_FILES, skillDir } from "@/tools/simplify-code/install.mjs";

const ORIGEM = path.join(process.cwd(), "tools", "simplify-code");
const DESTINO = skillDir();

describe("instalação do skill", () => {
  it("lista todos os arquivos que o skill precisa em runtime", () => {
    expect(INSTALL_FILES).toEqual([
      "README.md",
      "SKILL.md",
      "clones.mjs",
      "discover.mjs",
      "metrics.mjs",
      "scan.mjs",
    ]);
  });

  it("skillDir aponta para ~/.claude/skills/simplify-code", () => {
    expect(DESTINO).toBe(path.join(os.homedir(), ".claude", "skills", "simplify-code"));
  });

  it("cada arquivo instalado é byte-idêntico ao do repo", () => {
    if (!fs.existsSync(DESTINO)) {
      throw new Error(`Skill não instalado. Rode: node tools/simplify-code/install.mjs`);
    }
    for (const nome of INSTALL_FILES) {
      const noRepo = fs.readFileSync(path.join(ORIGEM, nome));
      const instalado = fs.readFileSync(path.join(DESTINO, nome));
      expect(instalado.equals(noRepo), `${nome} divergiu entre repo e ~/.claude`).toBe(true);
    }
  });

  it("não instala arquivos de desenvolvimento", () => {
    expect(INSTALL_FILES).not.toContain("install.mjs");
    expect(INSTALL_FILES).not.toContain("BASELINE.md");
  });
});
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run tests/unit_test/simplify-code/install-drift.spec.ts`

Expected: FAIL — cannot resolve `@/tools/simplify-code/install.mjs`.

**Step 3: Write the minimal implementation**

Create `tools/simplify-code/install.mjs`:

```js
#!/usr/bin/env node
// Copia o skill do repo (fonte da verdade, versionado e testado) para
// ~/.claude/skills/, onde o Claude Code lê. O teste de drift garante que
// as duas cópias não se separem em silêncio.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// install.mjs e BASELINE.md ficam de fora: são ferramenta de dev, não runtime.
export const INSTALL_FILES = [
  "README.md",
  "SKILL.md",
  "clones.mjs",
  "discover.mjs",
  "metrics.mjs",
  "scan.mjs",
];

export function skillDir() {
  return path.join(os.homedir(), ".claude", "skills", "simplify-code");
}

export function sourceDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function install() {
  const from = sourceDir();
  const to = skillDir();
  fs.mkdirSync(to, { recursive: true });
  for (const name of INSTALL_FILES) {
    fs.copyFileSync(path.join(from, name), path.join(to, name));
  }
  return to;
}

// só roda a cópia quando chamado como CLI, não quando importado pelo teste
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Instalado em ${install()}`);
}
```

**Step 4: Run the install**

Run: `node tools/simplify-code/install.mjs`

Expected: `Instalado em /home/sanchezz/.claude/skills/simplify-code`

**Step 5: Run the tests to make sure they pass**

Run: `npx vitest run tests/unit_test/simplify-code/install-drift.spec.ts`

Expected: PASS — 4 passed.

**Step 6: Verify the installed skill is discoverable**

Run: `ls -la ~/.claude/skills/simplify-code/ && head -5 ~/.claude/skills/simplify-code/SKILL.md`

Expected: the 6 files, and frontmatter opening with `---` then `name: simplify-code`.

> The skill appears in the roster only after Claude Code reloads. Tell the user to restart the session (or run `/help`) to pick it up — do not report it as "working" until they confirm it lists.

**Step 7: Commit**

```bash
git add tools/simplify-code/install.mjs tests/unit_test/simplify-code/install-drift.spec.ts
git commit -m "feat(simplify-code): add installer with drift guard test"
```

---

## Task 9: Real run and final verification

**REQUIRED SUB-SKILL:** Use `superpowers:verification-before-completion`. Evidence before assertions — run every command and read its real output before claiming anything passes.

**Files:**
- Create: `docs/superpowers/refactoring/2026-08-07-metrics.json` (generated)
- Modify: `docs/superpowers/specs/2026-08-07-complexity-reduction-skill-design.md`

**Step 1: Generate the real metrics report**

```bash
node tools/simplify-code/scan.mjs --out docs/superpowers/refactoring/2026-08-07-metrics.json
```

Expected: a summary line with a nonzero file count.

**Step 2: Verify the numbers by hand**

Pick the top candidate and confirm the tool is not lying. For `components/messages/send-message-form.tsx`:

```bash
wc -l components/messages/send-message-form.tsx
```

The reported `logicalLines` must be **less than** the raw `wc -l` (comments and blanks are excluded) and within roughly 15% of it. If `logicalLines` exceeds the raw count, the counter is double-counting — stop and fix Task 1.

**Step 3: Run the full test suite**

Run: `npm test`

Expected: all green. Paste the real tail of the output into your report — do not summarize it as "tests pass".

**Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: clean. Note that `tools/**` is inside tsconfig's `include` (`**/*.ts`) but our files are `.mjs`, so `tsc` skips them; the tests under `tests/` are excluded from tsconfig. If `npm run lint` reports pre-existing errors unrelated to `tools/simplify-code/`, report them and leave them alone.

**Step 5: Correct the spec's wrong numbers**

Edit `docs/superpowers/specs/2026-08-07-complexity-reduction-skill-design.md`. In section 2, replace the guessed file list with the real measurements from the JSON generated in Step 1, and add a line under the heading:

```markdown
> **Corrigido em 2026-08-07:** os números da lista abaixo foram medidos com
> `tools/simplify-code/scan.mjs`. A versão original citava
> `attendee-detail-sheet.tsx` com 289 linhas; o arquivo tem 128.
```

Also add a short "Deviations" note pointing at this plan's deviations table, so the spec stops contradicting the implementation.

**Step 6: Commit**

```bash
git add docs/superpowers/refactoring/2026-08-07-metrics.json \
        docs/superpowers/specs/2026-08-07-complexity-reduction-skill-design.md
git commit -m "docs(simplify-code): add measured baseline and correct spec numbers"
```

**Step 7: Finish the branch**

**REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`.

Note for that step: this branch (`feature/novo_ui`) already carries a large unrelated UI change. Do **not** fold the skill work into it silently — surface to the user that the diff mixes two efforts and let them choose whether to split.

---

## Out of Scope for v1

Recorded so they are deferred deliberately, not forgotten:

- **`/execute-refactor`** — a second skill that applies the plan automatically. The generated plan is executed via `superpowers:executing-plans` for now.
- **Near-miss clone detection** — needs a real similarity engine (`jscpd` or a suffix-automaton). v1 finds exact structural clones only.
- **Cognitive complexity** (nesting-weighted) alongside cyclomatic. Cyclomatic undercounts deeply nested but branch-light code.
- **Trend tracking** — committing metrics JSON over time to chart complexity drift.
- **Pre-commit hook** rejecting commits that raise max CC.
