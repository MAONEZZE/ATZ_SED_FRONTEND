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
