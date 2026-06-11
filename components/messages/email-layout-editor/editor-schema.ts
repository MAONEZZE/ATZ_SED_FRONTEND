/**
 * Schema declarativo e tipado da sidebar de controles do editor de e-mail.
 * Cada `key` é restrito a `keyof EmailLayoutConfig`, garantindo em tempo de
 * compilação que todo controle corresponde a uma chave real da config.
 */

import {
  EMAIL_FONT_STACKS,
  type EmailLayoutConfig,
} from "@/lib/email/email-layout-config";

export type FieldType = "text" | "textarea" | "color" | "range" | "toggle" | "select";

export interface EditorField {
  key: keyof EmailLayoutConfig;
  label: string;
  type: FieldType;
  /** Dois campos lado a lado quando true (par). */
  half?: boolean;
  // range
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // select
  options?: { label: string; value: string }[];
}

export interface EditorSubgroup {
  label?: string;
  fields: EditorField[];
}

export interface EditorSection {
  id: string;
  title: string;
  defaultOpen?: boolean;
  groups: EditorSubgroup[];
}

const FONT_OPTIONS = Object.keys(EMAIL_FONT_STACKS).map((k) => ({
  label: k,
  value: k,
}));

const ALIGN_OPTIONS = [
  { label: "Centralizado", value: "center" },
  { label: "À esquerda", value: "left" },
  { label: "À direita", value: "right" },
];

export const EDITOR_SCHEMA: EditorSection[] = [
  {
    id: "content",
    title: "Conteúdo",
    defaultOpen: true,
    groups: [
      {
        label: "Header",
        fields: [
          { key: "eyebrow", label: "Texto superior / eyebrow", type: "text" },
          { key: "title", label: "Título", type: "textarea" },
        ],
      },
      {
        label: "Corpo",
        fields: [
          { key: "greeting", label: "Saudação", type: "text" },
          { key: "paragraph1", label: "Parágrafo 1 (aceita HTML)", type: "textarea" },
          { key: "paragraph2", label: "Parágrafo 2 (aceita HTML)", type: "textarea" },
        ],
      },
      {
        label: "Card de informações",
        fields: [
          { key: "locationIcon", label: "Ícone/emoji do local", type: "text" },
          { key: "infoLabel1", label: "Rótulo 1", type: "text", half: true },
          { key: "infoValue1", label: "Valor 1", type: "text", half: true },
          { key: "infoLabel2", label: "Rótulo 2", type: "text", half: true },
          { key: "infoValue2", label: "Valor 2", type: "text", half: true },
          { key: "infoLabel3", label: "Rótulo 3", type: "text", half: true },
          { key: "infoValue3", label: "Valor 3", type: "text", half: true },
        ],
      },
      {
        label: "Footer",
        fields: [
          { key: "farewell", label: "Despedida", type: "text", half: true },
          { key: "signature", label: "Assinatura", type: "text", half: true },
          { key: "showInstagram", label: "Mostrar Instagram", type: "toggle" },
          { key: "instagramUrl", label: "URL do Instagram", type: "text" },
          { key: "showYoutube", label: "Mostrar YouTube", type: "toggle" },
          { key: "youtubeUrl", label: "URL do YouTube", type: "text" },
          { key: "autoNotice", label: "Aviso automático", type: "textarea" },
        ],
      },
    ],
  },
  {
    id: "colors",
    title: "Cores",
    groups: [
      {
        label: "Header (gradiente)",
        fields: [
          { key: "headerColor1", label: "Cor 1", type: "color", half: true },
          { key: "headerColor2", label: "Cor 2", type: "color", half: true },
          { key: "headerColor3", label: "Cor 3", type: "color" },
          {
            key: "gradientAngle",
            label: "Ângulo do gradiente",
            type: "range",
            min: 0,
            max: 360,
            unit: "°",
          },
        ],
      },
      {
        label: "Identidade",
        fields: [
          { key: "accentColor", label: "Cor de destaque / accent", type: "color" },
          { key: "titleColor", label: "Título do header", type: "color" },
        ],
      },
      {
        label: "Fundos",
        fields: [
          { key: "pageBg", label: "Fundo da página", type: "color", half: true },
          { key: "emailBg", label: "Fundo do email", type: "color", half: true },
          { key: "cardBg", label: "Fundo do card", type: "color", half: true },
          { key: "footerBg", label: "Fundo do footer", type: "color", half: true },
        ],
      },
      {
        label: "Textos",
        fields: [
          { key: "strongTextColor", label: "Texto forte", type: "color", half: true },
          { key: "normalTextColor", label: "Texto normal", type: "color", half: true },
          { key: "footerTextColor", label: "Texto do footer", type: "color", half: true },
          { key: "footerNoticeColor", label: "Aviso do footer", type: "color", half: true },
          { key: "cardDividerColor", label: "Linha divisória do card", type: "color" },
        ],
      },
    ],
  },
  {
    id: "typography",
    title: "Tipografia",
    groups: [
      {
        fields: [
          {
            key: "fontFamily",
            label: "Família tipográfica",
            type: "select",
            options: FONT_OPTIONS,
          },
          {
            key: "titleSize",
            label: "Tamanho do título",
            type: "range",
            min: 18,
            max: 44,
            unit: "px",
          },
          {
            key: "bodySize",
            label: "Tamanho do corpo",
            type: "range",
            min: 12,
            max: 20,
            unit: "px",
          },
          {
            key: "eyebrowSize",
            label: "Tamanho do eyebrow",
            type: "range",
            min: 8,
            max: 16,
            unit: "px",
          },
          {
            key: "eyebrowSpacing",
            label: "Espaçamento do eyebrow",
            type: "range",
            min: 0,
            max: 8,
            unit: "px",
          },
        ],
      },
    ],
  },
  {
    id: "layout",
    title: "Layout",
    groups: [
      {
        fields: [
          {
            key: "emailWidth",
            label: "Largura do email",
            type: "range",
            min: 320,
            max: 680,
            unit: "px",
          },
          {
            key: "sidePadding",
            label: "Padding lateral interno",
            type: "range",
            min: 16,
            max: 64,
            unit: "px",
          },
          {
            key: "headerHeight",
            label: "Altura do header",
            type: "range",
            min: 100,
            max: 280,
            unit: "px",
          },
          {
            key: "headerAlign",
            label: "Alinhamento do header",
            type: "select",
            options: ALIGN_OPTIONS,
          },
          {
            key: "emailRadius",
            label: "Arredondamento do email",
            type: "range",
            min: 0,
            max: 28,
            unit: "px",
          },
          {
            key: "cardRadius",
            label: "Arredondamento do card",
            type: "range",
            min: 0,
            max: 24,
            unit: "px",
          },
          {
            key: "cardBorderWidth",
            label: "Borda esquerda do card",
            type: "range",
            min: 0,
            max: 10,
            unit: "px",
          },
          { key: "containerShadow", label: "Sombra do container", type: "toggle" },
        ],
      },
    ],
  },
];
