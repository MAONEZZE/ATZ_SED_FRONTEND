export type CardBorderSide = "left" | "top" | "all" | "none";

export interface EmailLayoutConfig {
  eyebrow: string;

  title: string;

  subtitle: string;

  headerDecor: string;

  greeting: string;

  paragraph1: string;

  paragraph2: string;

  locationIcon: string;
  infoLabel1: string;
  infoValue1: string;
  infoLabel2: string;
  infoValue2: string;
  infoLabel3: string;
  infoValue3: string;

  farewell: string;
  signature: string;
  showInstagram: boolean;
  instagramUrl: string;
  showYoutube: boolean;
  youtubeUrl: string;
  autoNotice: string;

  headerGradient: boolean;
  headerColor1: string;
  headerColor2: string;
  headerColor3: string;

  gradientAngle: number;

  headerBorderWidth: number;
  headerBorderColor: string;

  accentColor: string;

  titleColor: string;
  subtitleColor: string;

  pageBg: string;
  emailBg: string;
  cardBg: string;

  footerGradient: boolean;
  footerBg: string;
  footerColor2: string;

  strongTextColor: string;
  normalTextColor: string;
  greetingColor: string;
  footerTextColor: string;
  footerNoticeColor: string;
  cardDividerColor: string;
  cardBorderColor: string;

  fontFamily: string;

  titleSize: number;

  titleWeight: number;
  titleItalic: boolean;

  bodySize: number;

  eyebrowSize: number;

  eyebrowSpacing: number;

  greetingSize: number;
  greetingUppercase: boolean;

  greetingSpacing: number;

  emailWidth: number;

  sidePadding: number;

  headerHeight: number;

  headerAlign: "left" | "center" | "right";

  emailRadius: number;

  cardRadius: number;

  cardBorderSide: CardBorderSide;

  cardBorderWidth: number;

  containerShadow: boolean;
}

export const EMAIL_FONT_STACKS: Record<string, string> = {
  "Helvetica/Arial": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  Georgia: "Georgia, 'Times New Roman', Times, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Verdana: "Verdana, Geneva, sans-serif",
  "Trebuchet MS": "'Trebuchet MS', Helvetica, Arial, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Courier New": "'Courier New', Courier, monospace",
};

export const DEFAULTS: EmailLayoutConfig = Object.freeze({
  eyebrow: "CONVITE EXCLUSIVO",
  title: "Noite de Gala\nAtlas Awards 2026",
  subtitle: "",
  headerDecor: "",

  greeting: "Você está convidado",
  paragraph1:
    "Celebre conosco uma noite inesquecível de reconhecimento, networking e celebração dos maiores talentos do setor financeiro. O <strong>Atlas Awards 2026</strong> reunirá líderes, investidores e visionários para premiar as melhores iniciativas do ano.",
  paragraph2:
    "Dress code: traje social executivo. Vagas limitadas — confirme sua presença com antecedência.",

  locationIcon: "📍",
  infoLabel1: "Local",
  infoValue1: "Hotel Fasano — Av. Vieira Souto, 80 — Ipanema, RJ",
  infoLabel2: "Data",
  infoValue2: "26 de Julho, 2026",
  infoLabel3: "Horário",
  infoValue3: "19h00",

  farewell: "Abraços,",
  signature: "Equipe Atlaz",
  showInstagram: true,
  instagramUrl: "https://www.instagram.com/by.atlaz",
  showYoutube: true,
  youtubeUrl: "https://www.youtube.com/@AtlazLearningBrandVenture",
  autoNotice:
    "Por favor, pedimos que você não responda esse e-mail, pois se trata de uma mensagem automática.",

  headerGradient: true,
  headerColor1: "#1a1a2e",
  headerColor2: "#16213e",
  headerColor3: "#0f3460",
  gradientAngle: 135,
  headerBorderWidth: 0,
  headerBorderColor: "#111111",

  accentColor: "#e94560",
  titleColor: "#ffffff",
  subtitleColor: "#e94560",

  pageBg: "#f4f4f4",
  emailBg: "#ffffff",
  cardBg: "#f8f9fc",
  footerGradient: false,
  footerBg: "#1a1a2e",
  footerColor2: "#16213e",

  strongTextColor: "#1a1a2e",
  normalTextColor: "#555555",
  greetingColor: "#1a1a2e",
  footerTextColor: "#cccccc",
  footerNoticeColor: "#555555",
  cardDividerColor: "#e2e6f0",
  cardBorderColor: "#e94560",

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
