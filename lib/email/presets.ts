/**
 * Presets de layout por estilo. Cada botão "Estilo" seleciona um destes; o
 * editor visual ("Editar layout") abre seedado com o preset escolhido.
 * Todos derivam de DEFAULTS (gala) sobrescrevendo cores/tipografia/layout.
 */

import { DEFAULTS, type EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";

export const EMAIL_LAYOUT_PRESETS: Record<EmailTemplateKey, EmailLayoutConfig> = {
  elegante: { ...DEFAULTS },

  minimalista: {
    ...DEFAULTS,
    eyebrow: "CONVITE — 2026",
    headerColor1: "#ffffff",
    headerColor2: "#ffffff",
    headerColor3: "#ffffff",
    titleColor: "#111111",
    accentColor: "#111111",
    pageBg: "#f4f4f4",
    emailBg: "#ffffff",
    cardBg: "#fafafa",
    footerBg: "#111111",
    cardDividerColor: "#e8e8e8",
    strongTextColor: "#111111",
    normalTextColor: "#666666",
    fontFamily: "Georgia",
    titleSize: 30,
    headerHeight: 130,
    cardBorderWidth: 0,
  },

  profissional: {
    ...DEFAULTS,
    eyebrow: "CONVITE CORPORATIVO",
    headerColor1: "#0b2545",
    headerColor2: "#13315c",
    headerColor3: "#1d4e89",
    accentColor: "#3a86ff",
    titleColor: "#ffffff",
    pageBg: "#eef2f7",
    cardBg: "#f2f6fc",
    footerBg: "#0b2545",
    cardDividerColor: "#dbe5f1",
    fontFamily: "Helvetica/Arial",
  },

  acolhedor: {
    ...DEFAULTS,
    eyebrow: "VOCÊ É NOSSO CONVIDADO",
    headerColor1: "#7a3b2e",
    headerColor2: "#a14a32",
    headerColor3: "#c86b4a",
    accentColor: "#e08e45",
    titleColor: "#fff8f0",
    pageBg: "#fbf3ec",
    emailBg: "#fffdfb",
    cardBg: "#fbeee2",
    footerBg: "#5a2c22",
    cardDividerColor: "#efd9c6",
    strongTextColor: "#5a2c22",
    normalTextColor: "#6b4a3a",
    fontFamily: "Georgia",
  },
};
