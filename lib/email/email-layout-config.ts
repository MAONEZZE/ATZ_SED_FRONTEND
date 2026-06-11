/**
 * Modelo de dados do editor visual de layout de e-mail (convite de gala).
 *
 * `EmailLayoutConfig` carrega todas as chaves customizáveis; `DEFAULTS` traz os
 * valores exatos do template original. O estado do editor é inicializado com
 * `{ ...DEFAULTS, ...configSalva }`, de modo que configs antigas persistidas
 * toleram chaves novas adicionadas em versões futuras.
 */

export type CardBorderSide = "left" | "top" | "all" | "none";

export interface EmailLayoutConfig {
  // ── Conteúdo — Header ──
  /** Texto superior em destaque (eyebrow). */
  eyebrow: string;
  /** Título do header; cada quebra de linha vira <br> no e-mail. */
  title: string;
  /** Subtítulo opcional abaixo do título (linha estilizada). Vazio = nenhum. */
  subtitle: string;
  /** Decoração textual opcional abaixo do título (ex.: emoji). Vazio = nenhuma. */
  headerDecor: string;

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

  // ── Cores — Header ──
  /** Header com gradiente (true) ou cor sólida (usa headerColor1). */
  headerGradient: boolean;
  headerColor1: string;
  headerColor2: string;
  headerColor3: string;
  /** Ângulo do gradiente em graus (0–360). */
  gradientAngle: number;
  /** Borda inferior do header (px); 0 = sem borda. */
  headerBorderWidth: number;
  headerBorderColor: string;

  // ── Cores — Identidade ──
  /** Cor de destaque (eyebrow, borda do card e rótulos do card). */
  accentColor: string;
  /** Cor do título do header. */
  titleColor: string;
  subtitleColor: string;

  // ── Cores — Fundos ──
  pageBg: string;
  emailBg: string;
  cardBg: string;
  /** Footer com gradiente (usa footerBg → footerColor2) ou cor sólida. */
  footerGradient: boolean;
  footerBg: string;
  footerColor2: string;

  // ── Cores — Textos ──
  strongTextColor: string;
  normalTextColor: string;
  greetingColor: string;
  footerTextColor: string;
  footerNoticeColor: string;
  cardDividerColor: string;
  cardBorderColor: string;

  // ── Tipografia ──
  /** Chave de EMAIL_FONT_STACKS. */
  fontFamily: string;
  /** Tamanho do título (px). */
  titleSize: number;
  /** Peso do título (300/400/600/700). */
  titleWeight: number;
  titleItalic: boolean;
  /** Tamanho do corpo (px). */
  bodySize: number;
  /** Tamanho do eyebrow (px). */
  eyebrowSize: number;
  /** Letter-spacing do eyebrow (px). */
  eyebrowSpacing: number;
  /** Tamanho da saudação (px). */
  greetingSize: number;
  greetingUppercase: boolean;
  /** Letter-spacing da saudação (px). */
  greetingSpacing: number;

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
  /** Lado da borda destacada do card. */
  cardBorderSide: CardBorderSide;
  /** Espessura da borda destacada do card (px); 0 remove a borda. */
  cardBorderWidth: number;
  /** Sombra do container. */
  containerShadow: boolean;
}

/** Stacks tipográficas seguras para clientes de e-mail. Chave → CSS font-family. */
export const EMAIL_FONT_STACKS: Record<string, string> = {
  "Helvetica/Arial": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  Georgia: "Georgia, 'Times New Roman', Times, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Verdana: "Verdana, Geneva, sans-serif",
  "Trebuchet MS": "'Trebuchet MS', Helvetica, Arial, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Courier New": "'Courier New', Courier, monospace",
};

/** Valores do template "Profissional" (gala) — base do editor. */
export const DEFAULTS: EmailLayoutConfig = Object.freeze({
  // Conteúdo — Header
  eyebrow: "CONVITE EXCLUSIVO",
  title: "Noite de Gala\nAtlas Awards 2026",
  subtitle: "",
  headerDecor: "",

  // Conteúdo — Corpo
  greeting: "Você está convidado",
  paragraph1:
    "Celebre conosco uma noite inesquecível de reconhecimento, networking e celebração dos maiores talentos do setor financeiro. O <strong>Atlas Awards 2026</strong> reunirá líderes, investidores e visionários para premiar as melhores iniciativas do ano.",
  paragraph2:
    "Dress code: traje social executivo. Vagas limitadas — confirme sua presença com antecedência.",

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
    "Por favor, pedimos que você não responda esse e-mail, pois se trata de uma mensagem automática.",

  // Cores — Header
  headerGradient: true,
  headerColor1: "#1a1a2e",
  headerColor2: "#16213e",
  headerColor3: "#0f3460",
  gradientAngle: 135,
  headerBorderWidth: 0,
  headerBorderColor: "#111111",

  // Cores — Identidade
  accentColor: "#e94560",
  titleColor: "#ffffff",
  subtitleColor: "#e94560",

  // Cores — Fundos
  pageBg: "#f4f4f4",
  emailBg: "#ffffff",
  cardBg: "#f8f9fc",
  footerGradient: false,
  footerBg: "#1a1a2e",
  footerColor2: "#16213e",

  // Cores — Textos
  strongTextColor: "#1a1a2e",
  normalTextColor: "#555555",
  greetingColor: "#1a1a2e",
  footerTextColor: "#cccccc",
  footerNoticeColor: "#555555",
  cardDividerColor: "#e2e6f0",
  cardBorderColor: "#e94560",

  // Tipografia
  fontFamily: "Helvetica/Arial",
  titleSize: 28,
  titleWeight: 700,
  titleItalic: false,
  bodySize: 15,
  eyebrowSize: 10,
  eyebrowSpacing: 3,
  greetingSize: 16,
  greetingUppercase: false,
  greetingSpacing: 0,

  // Layout
  emailWidth: 560,
  sidePadding: 40,
  headerHeight: 148,
  headerAlign: "center",
  emailRadius: 12,
  cardRadius: 10,
  cardBorderSide: "left",
  cardBorderWidth: 4,
  containerShadow: true,
});
