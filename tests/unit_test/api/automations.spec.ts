import { describe, expect, it } from "vitest";
import {
  buildAutomationPatch,
  invalidAutomationFormReason,
  sameFormIds,
  triggerRequiresForm,
  triggerUsesSubmissionScope,
  type AutomationSnapshot,
} from "@/lib/api/automations";
import type { AutomationTrigger } from "@/lib/api/types";

const ALL_TRIGGERS: AutomationTrigger[] = [
  "on_registration",
  "on_approval",
  "on_rejection",
  "on_form_submitted",
  "recurring",
  "on_date",
  "on_date_form_field",
];

describe("triggerRequiresForm", () => {
  it("só on_form_submitted e on_date_form_field exigem formIds", () => {
    const required = ALL_TRIGGERS.filter(triggerRequiresForm);
    expect(required.sort()).toEqual(["on_date_form_field", "on_form_submitted"]);
  });
});

describe("triggerUsesSubmissionScope", () => {
  it("só on_registration e on_form_submitted escopam por submissão", () => {
    const submission = ALL_TRIGGERS.filter(triggerUsesSubmissionScope);
    expect(submission.sort()).toEqual(["on_form_submitted", "on_registration"]);
  });
});

describe("invalidAutomationFormReason", () => {
  const dateFieldForms = new Set(["form-with-date"]);

  it("formulário anônimo é inválido em qualquer gatilho", () => {
    const form = { id: "form-1", anonymous: true };
    expect(invalidAutomationFormReason(form, "on_approval", dateFieldForms)).not.toBeNull();
    expect(
      invalidAutomationFormReason(form, "on_date_form_field", dateFieldForms),
    ).not.toBeNull();
  });

  it("formulário sem campo de data só é inválido em on_date_form_field", () => {
    const form = { id: "form-sem-data", anonymous: false };
    expect(invalidAutomationFormReason(form, "on_approval", dateFieldForms)).toBeNull();
    expect(
      invalidAutomationFormReason(form, "on_date_form_field", dateFieldForms),
    ).not.toBeNull();
  });

  it("formulário com campo de data é válido em on_date_form_field", () => {
    const form = { id: "form-with-date", anonymous: false };
    expect(
      invalidAutomationFormReason(form, "on_date_form_field", dateFieldForms),
    ).toBeNull();
  });

  it("formulário normal é válido nos gatilhos opcionais", () => {
    const form = { id: "form-normal", anonymous: false };
    expect(invalidAutomationFormReason(form, "on_registration", dateFieldForms)).toBeNull();
  });
});

describe("sameFormIds", () => {
  it("ignora ordem", () => {
    expect(sameFormIds(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("detecta diferença de tamanho ou conteúdo", () => {
    expect(sameFormIds(["a"], ["a", "b"])).toBe(false);
    expect(sameFormIds(["a"], ["b"])).toBe(false);
  });
});

describe("buildAutomationPatch", () => {
  function snapshot(overrides: Partial<AutomationSnapshot> = {}): AutomationSnapshot {
    return {
      templateId: "tpl-1",
      trigger: "on_date_form_field",
      formIds: [],
      cron: null,
      timezone: null,
      sendAt: null,
      active: true,
      ...overrides,
    };
  }

  it("regra legada sem formulário: alternar só 'active' não toca formIds", () => {
    const original = snapshot({ active: true });
    const current = snapshot({ active: false });
    expect(buildAutomationPatch(original, current)).toEqual({ active: false });
  });

  it("campo inalterado não entra na chave do PATCH", () => {
    const original = snapshot({ templateId: "tpl-1", active: true });
    const current = snapshot({ templateId: "tpl-1", active: true });
    expect(buildAutomationPatch(original, current)).toEqual({});
  });

  it("remoção deliberada de todos os formulários é enviada como formIds: []", () => {
    const original = snapshot({ formIds: ["f1", "f2"] });
    const current = snapshot({ formIds: [] });
    expect(buildAutomationPatch(original, current)).toEqual({ formIds: [] });
  });

  it("formIds sobrevive quando o gatilho muda mas a seleção não é tocada", () => {
    const original = snapshot({ trigger: "on_registration", formIds: ["f1"] });
    const current = snapshot({ trigger: "on_approval", formIds: ["f1"] });
    expect(buildAutomationPatch(original, current)).toEqual({ trigger: "on_approval" });
  });

  it("cron equivalente (zero à esquerda) não entra no PATCH", () => {
    const original = snapshot({
      trigger: "recurring",
      cron: "05 09 * * 1",
      timezone: "America/Sao_Paulo",
    });
    const current = snapshot({
      trigger: "recurring",
      cron: "5 9 * * 1",
      timezone: "America/Sao_Paulo",
    });
    expect(buildAutomationPatch(original, current)).toEqual({});
  });

  it("sair de recurring envia cron e timezone null explícitos", () => {
    const original = snapshot({
      trigger: "recurring",
      cron: "0 9 * * 1",
      timezone: "America/Sao_Paulo",
    });
    const current = snapshot({ trigger: "on_approval", cron: null, timezone: null });
    expect(buildAutomationPatch(original, current)).toEqual({
      trigger: "on_approval",
      cron: null,
      timezone: null,
    });
  });

  it("entrar em recurring envia cron e timezone", () => {
    const original = snapshot({ trigger: "on_approval", cron: null, timezone: null });
    const current = snapshot({
      trigger: "recurring",
      cron: "0 9 * * 1",
      timezone: "America/Sao_Paulo",
    });
    expect(buildAutomationPatch(original, current)).toEqual({
      trigger: "recurring",
      cron: "0 9 * * 1",
      timezone: "America/Sao_Paulo",
    });
  });

  it("sendAt só entra no PATCH quando o gatilho atual é on_date", () => {
    const original = snapshot({ trigger: "on_date", sendAt: "2026-09-01T12:00:00.000Z" });
    const current = snapshot({ trigger: "on_approval", sendAt: null });
    // Trigger mudou para um gatilho que não usa sendAt — o service limpa
    // sozinho no backend, então o front não deve mandar sendAt explícito.
    expect(buildAutomationPatch(original, current)).toEqual({ trigger: "on_approval" });
  });

  it("sendAt alterado dentro de on_date entra no PATCH", () => {
    const original = snapshot({ trigger: "on_date", sendAt: "2026-09-01T12:00:00.000Z" });
    const current = snapshot({ trigger: "on_date", sendAt: "2026-09-02T12:00:00.000Z" });
    expect(buildAutomationPatch(original, current)).toEqual({
      sendAt: "2026-09-02T12:00:00.000Z",
    });
  });

  it("sendAt equivalente (mesmo instante, formatação diferente) não entra no PATCH", () => {
    const original = snapshot({ trigger: "on_date", sendAt: "2026-09-01T12:00:00.000Z" });
    const current = snapshot({ trigger: "on_date", sendAt: "2026-09-01T12:00:00Z" });
    expect(buildAutomationPatch(original, current)).toEqual({});
  });
});
