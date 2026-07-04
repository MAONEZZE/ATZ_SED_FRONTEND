import { describe, expect, it } from "vitest";
import { resolveTemplateSelection } from "@/lib/messages/resolve-template-selection";
import type { MessageTemplate } from "@/lib/api/types";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";

const base: MessageTemplate = {
  id: "t1",
  eventId: null,
  name: "T",
  channel: "email",
  subject: "Assunto",
  body: "corpo",
  layoutConfig: null,
  styleKey: null,
  createdAt: "",
  updatedAt: "",
};

describe("resolveTemplateSelection", () => {
  it("sem template limpa body/subject/layout", () => {
    expect(resolveTemplateSelection(null, "email")).toEqual({
      body: "",
      subject: "",
      layoutConfig: null,
      activeStyle: null,
    });
  });

  it("template HTML (layoutConfig presente) usa body salvo direto", () => {
    const cfg = EMAIL_LAYOUT_PRESETS.minimalista;
    const html = buildEmail(cfg);
    const tpl: MessageTemplate = {
      ...base,
      body: html,
      layoutConfig: cfg,
      styleKey: "minimalista",
    };
    expect(resolveTemplateSelection(tpl, "email")).toEqual({
      body: html,
      subject: "Assunto",
      layoutConfig: cfg,
      activeStyle: "minimalista",
    });
  });

  it("template texto puro mantém body como texto e sem layout", () => {
    const tpl: MessageTemplate = { ...base, body: "Olá {{nome}}" };
    expect(resolveTemplateSelection(tpl, "email")).toEqual({
      body: "Olá {{nome}}",
      subject: "Assunto",
      layoutConfig: null,
      activeStyle: null,
    });
  });

  it("canal whatsapp ignora subject", () => {
    const tpl: MessageTemplate = { ...base, channel: "whatsapp", body: "oi" };
    const r = resolveTemplateSelection(tpl, "whatsapp");
    expect(r.subject).toBe("");
    expect(r.body).toBe("oi");
  });
});
