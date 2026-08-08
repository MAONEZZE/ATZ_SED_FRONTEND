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
