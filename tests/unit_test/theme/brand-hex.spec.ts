// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const SCAN_DIRS = ["app", "components", "lib", "hooks"];
const EXCLUDE_DIRS = [
  path.join(ROOT, "lib", "email"),
  path.join(ROOT, "components", "messages", "email-layout-editor"),
  path.join(ROOT, ".next"),
  path.join(ROOT, "public"),
];
const EXCLUDE_FILES = [path.join(ROOT, "app", "globals.css")];
const SCAN_EXTENSIONS = [".ts", ".tsx", ".css"];

const FORBIDDEN_HEXES = ["#5ca838", "#dfe3e1", "#8b9a9f", "#51636a", "#16262b"];

function isExcluded(filePath: string): boolean {
  if (EXCLUDE_FILES.includes(filePath)) return true;
  return EXCLUDE_DIRS.some((dir) => filePath.startsWith(dir + path.sep));
}

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { recursive: true }) as string[];
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (isExcluded(full)) continue;
    if (!SCAN_EXTENSIONS.includes(path.extname(full))) continue;
    if (!statSync(full).isFile()) continue;
    files.push(full);
  }
  return files;
}

const files = SCAN_DIRS.flatMap((d) => listSourceFiles(path.join(ROOT, d)));

describe("hexes do blog akeel — nunca em src/fixtures (CLAUDE.md §Cores)", () => {
  it("varreu ao menos um arquivo (sanity do glob)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const hex of FORBIDDEN_HEXES) {
    it(`${hex} não aparece fora de lib/email e email-layout-editor`, () => {
      const offenders = files.filter((f) => readFileSync(f, "utf-8").toLowerCase().includes(hex));
      expect(offenders).toEqual([]);
    });
  }
});
