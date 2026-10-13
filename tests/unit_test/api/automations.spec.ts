import { describe, expect, it } from "vitest";
import {
  buildAutomationPatch,
  computeEventDelayFireAt,
  eventDelayStatus,
  formatDelaySummary,
  invalidAutomationFormReason,
  patchRevalidatesDelay,
  sameFormIds,
  translateAutomationError,
  validateEventDelay,
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
  "on_event_delay",
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

describe("buildAutomationPatch — on_event_delay", () => {
  function snapshot(overrides: Partial<AutomationSnapshot> = {}): AutomationSnapshot {
    return {
      templateId: "tpl-1",
      trigger: "on_event_delay",
      formIds: [],
      cron: null,
      timezone: null,
      sendAt: null,
      delayDirection: "before",
      delayValue: 2,
      delayUnit: "hours",
      active: true,
      ...overrides,
    };
  }

  it("trocar para on_event_delay envia os 3 campos de delay no mesmo PATCH", () => {
    const original = snapshot({
      trigger: "on_approval",
      delayDirection: null,
      delayValue: null,
      delayUnit: null,
    });
    expect(buildAutomationPatch(original, snapshot())).toEqual({
      trigger: "on_event_delay",
      delayDirection: "before",
      delayValue: 2,
      delayUnit: "hours",
    });
  });

  it("alterar só o valor envia só delayValue", () => {
    expect(buildAutomationPatch(snapshot(), snapshot({ delayValue: 3 }))).toEqual({
      delayValue: 3,
    });
  });

  it("sair de on_event_delay não envia campos de delay (backend zera)", () => {
    const current = snapshot({
      trigger: "on_approval",
      delayDirection: null,
      delayValue: null,
      delayUnit: null,
    });
    expect(buildAutomationPatch(snapshot(), current)).toEqual({ trigger: "on_approval" });
  });

  it("delay inalterado não entra no PATCH", () => {
    expect(buildAutomationPatch(snapshot(), snapshot({ active: false }))).toEqual({
      active: false,
    });
  });
});

describe("patchRevalidatesDelay", () => {
  it("muda delay, ativa ou troca para on_event_delay → revalida", () => {
    expect(patchRevalidatesDelay({ delayValue: 3 })).toBe(true);
    expect(patchRevalidatesDelay({ delayUnit: "days" })).toBe(true);
    expect(patchRevalidatesDelay({ active: true })).toBe(true);
    expect(patchRevalidatesDelay({ trigger: "on_event_delay" })).toBe(true);
  });

  it("formIds, desativar ou PATCH vazio não revalidam", () => {
    expect(patchRevalidatesDelay({ formIds: ["f1"] })).toBe(false);
    expect(patchRevalidatesDelay({ active: false })).toBe(false);
    expect(patchRevalidatesDelay({})).toBe(false);
  });
});

describe("computeEventDelayFireAt", () => {
  const event = {
    eventDate: "2027-03-10T23:00:00.000Z",
    endDate: "2027-03-11T02:00:00.000Z",
  };

  it("before subtrai o delay de eventDate", () => {
    const at = computeEventDelayFireAt(event, {
      delayDirection: "before",
      delayValue: 2,
      delayUnit: "hours",
    });
    expect(at?.toISOString()).toBe("2027-03-10T21:00:00.000Z");
  });

  it("after soma o delay a endDate", () => {
    const at = computeEventDelayFireAt(event, {
      delayDirection: "after",
      delayValue: 1,
      delayUnit: "days",
    });
    expect(at?.toISOString()).toBe("2027-03-12T02:00:00.000Z");
  });

  it("after sem endDate usa eventDate", () => {
    const at = computeEventDelayFireAt(
      { eventDate: event.eventDate, endDate: null },
      { delayDirection: "after", delayValue: 30, delayUnit: "minutes" },
    );
    expect(at?.toISOString()).toBe("2027-03-10T23:30:00.000Z");
  });

  it("evento sem eventDate → null", () => {
    expect(
      computeEventDelayFireAt(
        { eventDate: null, endDate: null },
        { delayDirection: "before", delayValue: 1, delayUnit: "days" },
      ),
    ).toBeNull();
  });
});

describe("validateEventDelay", () => {
  const ok = { delayDirection: "before" as const, delayUnit: "days" as const };

  it("aceita limites válidos", () => {
    expect(validateEventDelay({ ...ok, delayValue: 1 })).toBeNull();
    expect(validateEventDelay({ ...ok, delayValue: 365 })).toBeNull();
    expect(validateEventDelay({ ...ok, delayValue: 8760, delayUnit: "hours" })).toBeNull();
    expect(
      validateEventDelay({ ...ok, delayValue: 525600, delayUnit: "minutes" }),
    ).toBeNull();
  });

  it("rejeita 0, 1.5 e vazio", () => {
    expect(validateEventDelay({ ...ok, delayValue: 0 })).toMatch(/inteiro/);
    expect(validateEventDelay({ ...ok, delayValue: 1.5 })).toMatch(/inteiro/);
    expect(validateEventDelay({ ...ok, delayValue: null })).toMatch(/Informe/);
  });

  it("rejeita acima de 365 dias em qualquer unidade", () => {
    expect(validateEventDelay({ ...ok, delayValue: 366 })).toMatch(/365 dias/);
    expect(validateEventDelay({ ...ok, delayValue: 8761, delayUnit: "hours" })).toMatch(
      /365 dias/,
    );
  });

  it("exige direção e unidade", () => {
    expect(validateEventDelay({ ...ok, delayDirection: null, delayValue: 1 })).not.toBeNull();
    expect(validateEventDelay({ ...ok, delayUnit: null, delayValue: 1 })).not.toBeNull();
  });
});

describe("formatDelaySummary", () => {
  it("singular e plural, antes e depois", () => {
    expect(
      formatDelaySummary({ delayDirection: "before", delayValue: 2, delayUnit: "hours" }),
    ).toBe("2 horas antes do início do evento");
    expect(
      formatDelaySummary({ delayDirection: "after", delayValue: 1, delayUnit: "days" }),
    ).toBe("1 dia depois do fim do evento");
    expect(
      formatDelaySummary({ delayDirection: "before", delayValue: 1, delayUnit: "minutes" }),
    ).toBe("1 minuto antes do início do evento");
  });
});

describe("eventDelayStatus", () => {
  const event = { eventDate: "2027-03-10T23:00:00.000Z", endDate: null };
  const rule = {
    delayDirection: "before" as const,
    delayValue: 2,
    delayUnit: "hours" as const,
  };

  it("sem firedForAt → pending", () => {
    expect(eventDelayStatus({ ...rule, firedForAt: null }, event)).toBe("pending");
  });

  it("firedForAt igual ao momento atual (formato ISO diferente) → fired", () => {
    expect(
      eventDelayStatus({ ...rule, firedForAt: "2027-03-10T21:00:00Z" }, event),
    ).toBe("fired");
  });

  it("evento remarcado: firedForAt antigo → pending", () => {
    expect(
      eventDelayStatus({ ...rule, firedForAt: "2027-03-09T21:00:00.000Z" }, event),
    ).toBe("pending");
  });

  it("evento sem data → no_date", () => {
    expect(
      eventDelayStatus({ ...rule, firedForAt: null }, { eventDate: null, endDate: null }),
    ).toBe("no_date");
  });
});

describe("translateAutomationError", () => {
  it("traduz o 409 de template+delay duplicado", () => {
    expect(
      translateAutomationError(
        "An active automation with this template and delay already exists on this event",
      ),
    ).toMatch(/Já existe uma automação ativa/);
  });

  it("mantém as demais mensagens", () => {
    expect(translateAutomationError("delay máximo é de 365 dias")).toBe(
      "delay máximo é de 365 dias",
    );
  });
});
