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
