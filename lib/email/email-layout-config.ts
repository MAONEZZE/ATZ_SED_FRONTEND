/**
 * Modelo de dados do editor visual de layout de e-mail (convite de gala).
 *
 * `EmailLayoutConfig` carrega todas as chaves customizáveis; `DEFAULTS` traz os
 * valores exatos do template original. O estado do editor é inicializado com
 * `{ ...DEFAULTS, ...configSalva }`, de modo que configs antigas persistidas
 * toleram chaves novas adicionadas em versões futuras.
 */

export interface EmailLayoutConfig {
  // ── Conteúdo — Header ──
  /** Texto superior em destaque (eyebrow). */
  eyebrow: string;
  /** Título do header; cada quebra de linha vira <br> no e-mail. */
  title: string;

  // ── Conteúdo — Corpo ──
  greeting: string;
  /** Aceita HTML simples (<strong> etc.), inserido sem escape. */
  paragraph1: string;
  /** Aceita HTML simples, inserido sem escape. */
  paragraph2: string;

  // ── Conteúdo — Card de informações ──
  locationIcon: string;
  infoLabel1: string;
  infoValue1: string;
  infoLabel2: string;
  infoValue2: string;
  infoLabel3: string;
  infoValue3: string;

  // ── Conteúdo — Footer ──
  farewell: string;
  signature: string;
  showInstagram: boolean;
  instagramUrl: string;
  showYoutube: boolean;
  youtubeUrl: string;
  autoNotice: string;

  // ── Cores — Header (gradiente) ──
  headerColor1: string;
  headerColor2: string;
  headerColor3: string;
  /** Ângulo do gradiente em graus (0–360). */
  gradientAngle: number;

  // ── Cores — Identidade ──
  /** Cor de destaque (eyebrow, borda do card, rótulos do card). */
  accentColor: string;
  /** Cor do título do header. */
  titleColor: string;

  // ── Cores — Fundos ──
  pageBg: string;
  emailBg: string;
  cardBg: string;
  footerBg: string;

  // ── Cores — Textos ──
  strongTextColor: string;
  normalTextColor: string;
  footerTextColor: string;
  footerNoticeColor: string;
  cardDividerColor: string;

  // ── Tipografia ──
  /** Chave de EMAIL_FONT_STACKS. */
  fontFamily: string;
  /** Tamanho do título (px). */
  titleSize: number;
  /** Tamanho do corpo (px); a saudação usa este valor + 1. */
  bodySize: number;
  /** Tamanho do eyebrow (px). */
  eyebrowSize: number;
  /** Letter-spacing do eyebrow (px). */
  eyebrowSpacing: number;

  // ── Layout ──
  /** Largura do e-mail (px). */
  emailWidth: number;
  /** Padding lateral interno (px) — header, corpo, card e footer. */
  sidePadding: number;
  /** Altura do header (px). */
  headerHeight: number;
  /** Alinhamento do header. */
  headerAlign: "left" | "center" | "right";
  /** Arredondamento do e-mail (px). */
  emailRadius: number;
  /** Arredondamento do card (px). */
  cardRadius: number;
  /** Borda esquerda do card (px); 0 remove a borda por completo. */
  cardBorderWidth: number;
  /** Sombra do container. */
  containerShadow: boolean;
}

/** Stacks tipográficas seguras para clientes de e-mail. Chave → CSS font-family. */
export const EMAIL_FONT_STACKS: Record<string, string> = {
  "Helvetica/Arial":
    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  Georgia: "Georgia, 'Times New Roman', Times, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Verdana: "Verdana, Geneva, sans-serif",
  "Trebuchet MS": "'Trebuchet MS', Helvetica, Arial, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Courier New": "'Courier New', Courier, monospace",
};

export const DEFAULTS: EmailLayoutConfig = Object.freeze({
  // Conteúdo — Header
  eyebrow: "CONVITE EXCLUSIVO",
  title: "Noite de Gala\nAtlas Awards 2026",

  // Conteúdo — Corpo
  greeting: "Você está convidado",
  paragraph1:
    "Celebre conosco uma noite inesquecível de reconhecimento, networking e celebração dos maiores talentos do setor financeiro. O <strong>Atlas Awards 2026</strong> reunirá líderes, investidores e visionários para premiar as melhores iniciativas do ano.",
  paragraph2:
    "Dress code: <strong>traje social executivo</strong>. Vagas limitadas — confirme sua presença com antecedência.",

  // Conteúdo — Card de informações
  locationIcon: "📍",
  infoLabel1: "Local",
  infoValue1: "Hotel Fasano — Av. Vieira Souto, 80 — Ipanema, RJ",
  infoLabel2: "Data",
  infoValue2: "26 de Julho, 2026",
  infoLabel3: "Horário",
  infoValue3: "19h00",

  // Conteúdo — Footer
  farewell: "Abraços,",
  signature: "Equipe Atlaz",
  showInstagram: true,
  instagramUrl: "https://www.instagram.com/by.atlaz",
  showYoutube: true,
  youtubeUrl: "https://www.youtube.com/@AtlazLearningBrandVenture",
  autoNotice:
    "Esta é uma mensagem automática, não responda esse e-mail. Em caso de dúvidas, entre em contato pelos nossos canais oficiais.",

  // Cores — Header (gradiente)
  headerColor1: "#1a1a2e",
  headerColor2: "#16213e",
  headerColor3: "#0f3460",
  gradientAngle: 135,

  // Cores — Identidade
  accentColor: "#e94560",
  titleColor: "#ffffff",

  // Cores — Fundos
  pageBg: "#f4f4f4",
  emailBg: "#ffffff",
  cardBg: "#f8f9fc",
  footerBg: "#1a1a2e",

  // Cores — Textos
  strongTextColor: "#1a1a2e",
  normalTextColor: "#555555",
  footerTextColor: "#cccccc",
  footerNoticeColor: "#555555",
  cardDividerColor: "#e2e6f0",

  // Tipografia
  fontFamily: "Helvetica/Arial",
  titleSize: 28,
  bodySize: 15,
  eyebrowSize: 10,
  eyebrowSpacing: 3,

  // Layout
  emailWidth: 560,
  sidePadding: 40,
  headerHeight: 148,
  headerAlign: "center",
  emailRadius: 12,
  cardRadius: 10,
  cardBorderWidth: 4,
  containerShadow: true,
});
