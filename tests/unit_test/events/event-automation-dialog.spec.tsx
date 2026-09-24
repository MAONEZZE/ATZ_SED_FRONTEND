import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { Automation, Form, FormField } from "@/lib/api/types";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

const createMutate = vi.fn();
const updateMutate = vi.fn();

const FORMS: Form[] = [
  {
    id: "f1",
    eventId: "evt-1",
    name: "Inscrição",
    slug: "inscricao",
    order: 0,
    description: null,
    postRegistrationMessage: null,
    linkPostSubscription: null,
    requireImageAuthorization: false,
    sendToPipedrive: false,
    anonymous: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "f2",
    eventId: "evt-1",
    name: "Pesquisa Anônima",
    slug: "pesquisa",
    order: 1,
    description: null,
    postRegistrationMessage: null,
    linkPostSubscription: null,
    requireImageAuthorization: false,
    sendToPipedrive: false,
    anonymous: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "f3",
    eventId: "evt-1",
    name: "Feedback",
    slug: "feedback",
    order: 2,
    description: null,
    postRegistrationMessage: null,
    linkPostSubscription: null,
    requireImageAuthorization: false,
    sendToPipedrive: false,
    anonymous: false,
    createdAt: "",
    updatedAt: "",
  },
];

// Só "Inscrição" (f1) tem campo de automação por data.
const FORM_FIELDS: FormField[] = [
  {
    id: "fld1",
    formId: "f1",
    label: "Data do evento",
    type: "on_date_automation_field",
    required: false,
    options: null,
    order: 0,
    isFixed: false,
    createdAt: "",
  },
];

vi.mock("@/lib/api/forms", () => ({
  useForms: () => ({ data: FORMS }),
}));

vi.mock("@/lib/api/form-fields", () => ({
  useFormFields: () => ({ data: FORM_FIELDS }),
}));

vi.mock("@/lib/api/global-messaging", () => ({
  useAllTemplates: () => ({
    data: {
      data: [
        { id: "tpl-1", eventId: "evt-1", name: "Template A", channel: "email" },
        { id: "tpl-global", eventId: null, name: "Template global", channel: "email" },
        { id: "tpl-other", eventId: "evt-2", name: "Outro evento", channel: "email" },
      ],
    },
  }),
  useCreateAutomationGlobal: () => ({ mutate: createMutate, isPending: false }),
  useUpdateAutomationGlobal: () => ({ mutate: updateMutate, isPending: false }),
}));

import { EventAutomationDialog } from "@/components/events/event-automation-dialog";

beforeEach(() => {
  createMutate.mockClear();
  updateMutate.mockClear();
});

function openFormsPopover() {
  fireEvent.click(
    screen.getByRole("button", { name: /selecionar formulários|formulário/i }),
  );
}

function pickTrigger(label: string) {
  // Sem aria-label próprio: o segundo combobox do dialog é o de Gatilho
  // (o primeiro é o de Template).
  const triggerCombobox = screen.getAllByRole("combobox")[1];
  fireEvent.click(triggerCombobox);
  const option = screen.getByRole("option", { name: label });
  fireEvent.click(option);
}

const ALL_TRIGGER_LABELS = [
  "Ao se inscrever",
  "Ao enviar um formulário",
  "Ao ser aprovado",
  "Ao ser rejeitado",
  "Recorrente (data/hora fixa)",
  "Em uma data específica",
  "Em uma data informada no formulário",
];

describe("EventAutomationDialog — seletor de templates", () => {
  it("exibe somente templates que pertencem ao evento atual", () => {
    render(
      <EventAutomationDialog
        eventId="evt-1"
        automation={null}
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);

    expect(screen.getByRole("option", { name: /Template A/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Template global/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /Outro evento/ })).toBeNull();
  });
});

describe("EventAutomationDialog — seletor de formulários por gatilho", () => {
  it("renderiza o seletor de formulários nos 7 gatilhos", () => {
    render(
      <EventAutomationDialog
        eventId="evt-1"
        automation={null}
        open
        onOpenChange={() => {}}
      />,
    );

    for (const label of ALL_TRIGGER_LABELS) {
      pickTrigger(label);
      expect(screen.getByText(/Formulários/)).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /selecionar formulários|formulário/i }),
      ).toBeTruthy();
    }
  });

  it("formulário anônimo aparece desabilitado com motivo, em qualquer gatilho", () => {
    render(
      <EventAutomationDialog
        eventId="evt-1"
        automation={null}
        open
        onOpenChange={() => {}}
      />,
    );
    openFormsPopover();

    const option = screen
      .getByText("Pesquisa Anônima")
      .closest("label") as HTMLLabelElement;
    const checkbox = within(option).getByRole("checkbox");
    expect(checkbox.hasAttribute("disabled")).toBe(true);
    expect(within(option).getByText(/anônimo/i)).toBeTruthy();
  });

  it("formulário sem campo de data só é bloqueado em on_date_form_field", () => {
    render(
      <EventAutomationDialog
        eventId="evt-1"
        automation={null}
        open
        onOpenChange={() => {}}
      />,
    );

    openFormsPopover();
    let feedbackRow = screen.getByText("Feedback").closest("label") as HTMLLabelElement;
    expect(within(feedbackRow).getByRole("checkbox").hasAttribute("disabled")).toBe(
      false,
    );

    pickTrigger("Em uma data informada no formulário");
    openFormsPopover();
    feedbackRow = screen.getByText("Feedback").closest("label") as HTMLLabelElement;
    expect(within(feedbackRow).getByRole("checkbox").hasAttribute("disabled")).toBe(true);
    expect(
      within(feedbackRow).getByText(/sem campo de automação por data/i),
    ).toBeTruthy();

    const inscricaoRow = screen
      .getByText("Inscrição")
      .closest("label") as HTMLLabelElement;
    expect(within(inscricaoRow).getByRole("checkbox").hasAttribute("disabled")).toBe(
      false,
    );
  });
});

describe("EventAutomationDialog — PATCH por diff", () => {
  const legacyAutomation: Automation = {
    id: "auto-1",
    eventId: "evt-1",
    templateId: "tpl-1",
    trigger: "on_date_form_field",
    formIds: [],
    delayMinutes: null,
    cron: null,
    timezone: null,
    active: true,
    folderId: null,
    order: 0,
    sendAt: null,
    firedAt: null,
    sendTime: null,
    name: null,
    createdAt: "",
    template: { id: "tpl-1", name: "Template A", channel: "email" },
  };

  it("alternar só 'Ativa' numa regra legada sem formulário não envia formIds", () => {
    render(
      <EventAutomationDialog
        eventId="evt-1"
        automation={legacyAutomation}
        open
        onOpenChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Ativa" }));
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const call = updateMutate.mock.calls[0][0];
    expect(call.input).toEqual({ active: false });
  });
});
