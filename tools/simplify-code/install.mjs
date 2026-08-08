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
