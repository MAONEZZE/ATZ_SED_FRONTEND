import { describe, expect, it } from "vitest";
import { buildEmail } from "@/lib/email/build-email";
import { DEFAULTS, type EmailLayoutConfig } from "@/lib/email/email-layout-config";

function build(overrides: Partial<EmailLayoutConfig> = {}) {
  return buildEmail({ ...DEFAULTS, ...overrides });
}

describe("buildEmail — documento", () => {
  it("retorna documento HTML completo", () => {
    const html = build();
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.trim().endsWith("</html>")).toBe(true);
  });

  it("usa a primeira linha do título como <title>", () => {
    const html = build({ title: "Primeira\nSegunda" });
    expect(html).toContain("<title>Primeira</title>");
  });

  it("converte quebras de linha do título em <br>", () => {
    const html = build({ title: "Linha A\nLinha B" });
    expect(html).toMatch(/Linha A<br\s*\/?>Linha B/);
  });

  it("converte quebras de linha do parágrafo 1 em <br>", () => {
    const html = build({ paragraph1: "Linha 1\nLinha 2" });
    expect(html).toMatch(/Linha 1<br\s*\/?>Linha 2/);
  });

  it("preserva HTML do parágrafo 1 (não escapa tags)", () => {
    const html = build({ paragraph1: "Olá <strong>mundo</strong>\nfim" });
    expect(html).toContain("<strong>mundo</strong>");
    expect(html).toMatch(/<strong>mundo<\/strong><br\s*\/?>fim/);
  });
});

describe("buildEmail — estrutura (defaults)", () => {
  it("usa tabelas com cellpadding/cellspacing/border zerados", () => {
    const html = build();
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
    expect(html).toContain('border="0"');
  });

  it("aplica gradiente do header com ângulo e três cores", () => {
    const html = build();
    expect(html).toContain(
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
    );
  });

  it("aplica largura do container como atributo e max-width inline", () => {
    const html = build({ emailWidth: 560 });
    expect(html).toContain('width="560"');
    expect(html).toContain("max-width:560px");
  });

  it("renderiza eyebrow, saudação e parágrafos", () => {
    const html = build();
    expect(html).toContain("CONVITE EXCLUSIVO");
    expect(html).toContain("Você está convidado");
    expect(html).toContain("Hotel Fasano");
  });
});

describe("buildEmail — toggles sociais", () => {
  it("inclui Instagram e YouTube por padrão", () => {
    const html = build();
    expect(html).toContain(DEFAULTS.instagramUrl);
    expect(html).toContain(DEFAULTS.youtubeUrl);
  });

  it("remove o td do Instagram quando desligado", () => {
    const html = build({ showInstagram: false });
    expect(html).not.toContain(DEFAULTS.instagramUrl);

    expect(html).toContain(DEFAULTS.youtubeUrl);
  });

  it("remove o td do YouTube quando desligado", () => {
    const html = build({ showYoutube: false });
    expect(html).not.toContain(DEFAULTS.youtubeUrl);
    expect(html).toContain(DEFAULTS.instagramUrl);
  });
});

describe("buildEmail — borda do card", () => {
  it("inclui border-left com a cor accent quando espessura > 0", () => {
    const html = build({ cardBorderWidth: 4, accentColor: "#e94560" });
    expect(html).toContain("border-left:4px solid #e94560");
  });

  it("não gera a borda accent do card quando espessura = 0", () => {
    const html = build({ cardBorderWidth: 0, accentColor: "#e94560" });
    expect(html).not.toContain("solid #e94560");
  });
});

describe("buildEmail — sombra", () => {
  it("inclui box-shadow quando ligada", () => {
    expect(build({ containerShadow: true })).toContain("box-shadow:0 4px 20px");
  });

  it("omite box-shadow quando desligada", () => {
    expect(build({ containerShadow: false })).not.toContain("box-shadow");
  });
});

describe("buildEmail — header sólido vs gradiente", () => {
  it("usa cor sólida quando headerGradient = false", () => {
    const html = build({ headerGradient: false, headerColor1: "#0d0d0d" });
    expect(html).toContain("background-color:#0d0d0d");
    expect(html).not.toContain("linear-gradient(135deg, #0d0d0d");
  });

  it("desenha borda inferior do header quando headerBorderWidth > 0", () => {
    const html = build({ headerBorderWidth: 2, headerBorderColor: "#111111" });
    expect(html).toContain("border-bottom:2px solid #111111");
  });
});

describe("buildEmail — lado da borda do card", () => {
  it("top → border-top", () => {
    const html = build({
      cardBorderSide: "top",
      cardBorderWidth: 2,
      cardBorderColor: "#c9a84c",
    });
    expect(html).toContain("border-top:2px solid #c9a84c");
  });

  it("all → border completa", () => {
    const html = build({
      cardBorderSide: "all",
      cardBorderWidth: 1,
      cardBorderColor: "#e8e8e8",
    });
    expect(html).toContain("border:1px solid #e8e8e8");
  });
});

describe("buildEmail — subtítulo e decoração", () => {
  it("renderiza subtítulo quando preenchido", () => {
    expect(build({ subtitle: "Subtítulo XYZ" })).toContain("Subtítulo XYZ");
  });

  it("omite subtítulo quando vazio", () => {
    expect(build({ subtitle: "" })).not.toContain("Subtítulo XYZ");
  });

  it("renderiza decoração (emoji) quando preenchida", () => {
    expect(build({ headerDecor: "🌟" })).toContain("🌟");
  });
});

describe("buildEmail — escape de HTML", () => {
  it("escapa textos simples (rótulos, valores)", () => {
    const html = build({ infoValue1: 'A & B <x> "y"' });
    expect(html).toContain("A &amp; B &lt;x&gt; &quot;y&quot;");
    expect(html).not.toContain("A & B <x>");
  });

  it("não escapa os parágrafos (HTML cru permitido)", () => {
    const html = build({ paragraph1: "Olá <strong>mundo</strong>" });
    expect(html).toContain("Olá <strong>mundo</strong>");
  });
});
