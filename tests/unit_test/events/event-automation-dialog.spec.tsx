import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { Automation, EventObject, Form, FormField } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

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

// 10/03/2027 20:00 em Brasília; fim às 23:00.
let mockEvent: Pick<EventObject, "eventDate" | "endDate"> | undefined = {
  eventDate: "2027-03-10T23:00:00.000Z",
  endDate: "2027-03-11T02:00:00.000Z",
};

vi.mock("@/lib/api/events", () => ({
  useEvent: () => ({ data: mockEvent }),
}));

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
  createMutate.mockReset();
  updateMutate.mockReset();
  mockEvent = {
    eventDate: "2027-03-10T23:00:00.000Z",
    endDate: "2027-03-11T02:00:00.000Z",
  };
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
  "Delay (antes/depois do evento)",
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
  it("renderiza o seletor de formulários nos 8 gatilhos", () => {
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
    delayDirection: null,
    delayValue: null,
    delayUnit: null,
    firedForAt: null,
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

describe("EventAutomationDialog — gatilho on_event_delay", () => {
  const DELAY_LABEL = "Delay (antes/depois do evento)";

  function renderNew() {
    render(
      <EventAutomationDialog eventId="evt-1" automation={null} open onOpenChange={() => {}} />,
    );
    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(screen.getByRole("option", { name: /Template A/ }));
    pickTrigger(DELAY_LABEL);
  }

  function pickOption(comboboxName: string, option: string) {
    fireEvent.click(screen.getByRole("combobox", { name: comboboxName }));
    fireEvent.click(screen.getByRole("option", { name: option }));
  }

  function typeValue(value: string) {
    fireEvent.change(screen.getByLabelText(/Valor/), { target: { value } });
  }

  function save() {
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));
  }

  it("cria regra 'antes' com os 3 campos e sem cron/sendAt", () => {
    renderNew();
    typeValue("2");
    save();

    expect(createMutate).toHaveBeenCalledTimes(1);
    const { input } = createMutate.mock.calls[0][0];
    expect(JSON.parse(JSON.stringify(input))).toEqual({
      templateId: "tpl-1",
      trigger: "on_event_delay",
      formIds: [],
      delayDirection: "before",
      delayValue: 2,
      delayUnit: "hours",
      active: true,
    });
  });

  it("cria regra 'depois' em dias", () => {
    renderNew();
    pickOption("Direção do delay", "Depois do fim do evento");
    pickOption("Unidade do delay", "Dias");
    typeValue("1");
    save();

    const { input } = createMutate.mock.calls[0][0];
    expect(input).toMatchObject({ delayDirection: "after", delayValue: 1, delayUnit: "days" });
  });

  it("esconde campos de recorrência e data fixa, mostra a pré-visualização", () => {
    renderNew();
    expect(screen.queryByLabelText("Hora")).toBeNull();
    expect(screen.queryByText(/Data e hora de envio/)).toBeNull();
    expect(screen.queryByText(/America\/Sao_Paulo/)).toBeNull();

    typeValue("2");
    // 20:00 − 2h em Brasília.
    expect(screen.getByText(/Dispara em 10\/03\/2027, 18:00/)).toBeTruthy();
  });

  it("evento sem data mostra aviso e bloqueia salvar", () => {
    mockEvent = { eventDate: null, endDate: null };
    renderNew();
    expect(screen.getByText(/Este evento não tem data/)).toBeTruthy();
    typeValue("2");
    save();
    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/não tem data/);
  });

  it.each([
    ["0", /inteiro/],
    ["1.5", /inteiro/],
    ["", /Informe/],
  ])("valor %j bloqueia com erro inline", (value, message) => {
    renderNew();
    typeValue(value);
    save();
    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(message);
  });

  it("366 dias bloqueia com erro de máximo", () => {
    renderNew();
    pickOption("Unidade do delay", "Dias");
    typeValue("366");
    save();
    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/365 dias/);
  });

  it("momento no passado bloqueia regra ativa e libera inativa", () => {
    mockEvent = { eventDate: "2020-01-01T12:00:00.000Z", endDate: null };
    renderNew();
    typeValue("1");
    save();
    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/já passou/);

    fireEvent.click(screen.getByRole("switch", { name: "Ativa" }));
    save();
    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0].input.active).toBe(false);
  });

  it("409 do backend aparece inline em português", () => {
    createMutate.mockImplementation((_vars, opts) =>
      opts.onError(
        new ApiError(
          409,
          "An active automation with this template and delay already exists on this event",
        ),
      ),
    );
    renderNew();
    typeValue("2");
    save();
    expect(screen.getByRole("alert").textContent).toMatch(/Já existe uma automação ativa/);
  });

  const delayRule: Automation = {
    id: "auto-d",
    eventId: "evt-1",
    templateId: "tpl-1",
    trigger: "on_event_delay",
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
    delayDirection: "before",
    delayValue: 2,
    delayUnit: "hours",
    firedForAt: null,
    name: null,
    createdAt: "",
    template: { id: "tpl-1", name: "Template A", channel: "email" },
  };

  it("edição pré-preenche o delay e o PATCH leva só o que mudou", () => {
    render(
      <EventAutomationDialog eventId="evt-1" automation={delayRule} open onOpenChange={() => {}} />,
    );
    expect((screen.getByLabelText(/Valor/) as HTMLInputElement).value).toBe("2");

    typeValue("3");
    save();
    expect(updateMutate.mock.calls[0][0].input).toEqual({ delayValue: 3 });
  });

  it("evento sem data não bloqueia edição que não revalida (ex.: desativar)", () => {
    mockEvent = { eventDate: null, endDate: null };
    render(
      <EventAutomationDialog eventId="evt-1" automation={delayRule} open onOpenChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Ativa" }));
    save();
    expect(updateMutate.mock.calls[0][0].input).toEqual({ active: false });
  });
});
