import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FormField } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock("@/lib/api/form-fields", () => ({
  useCreateFormField: () => ({ mutate: createMutate, isPending: false }),
  useUpdateFormField: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock("@/lib/utils/revalidate-public", () => ({
  revalidatePublicEvent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { FieldEditorDialog } from "@/components/form-builder/field-editor-dialog";

beforeEach(() => {
  createMutate.mockReset();
  updateMutate.mockReset();
});

function nameField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: "fld-name",
    formId: "form-1",
    label: "Nome completo",
    type: "name",
    required: true,
    options: null,
    order: 0,
    isFixed: false,
    createdAt: "",
    ...overrides,
  };
}

function textField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: "fld-text",
    formId: "form-1",
    label: "Empresa",
    type: "text",
    required: true,
    options: null,
    order: 0,
    isFixed: false,
    createdAt: "",
    ...overrides,
  };
}

function renderDialog(
  props: {
    field?: FormField | null;
    fields?: FormField[];
    onOpenChange?: (o: boolean) => void;
  } = {},
) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <FieldEditorDialog
        eventId="evt-1"
        field={props.field ?? null}
        fields={props.fields ?? []}
        open
        onOpenChange={props.onOpenChange ?? vi.fn()}
        nextOrder={0}
        formId="form-1"
      />
    </QueryClientProvider>,
  );
  return { queryClient };
}

function openTypeSelect() {
  fireEvent.click(screen.getByRole("combobox"));
}

function optionLabels() {
  return screen.getAllByRole("option").map((o) => o.textContent);
}

describe("FieldEditorDialog", () => {
  it("oferece a opção Nome logo depois de Telefone quando o formulário não tem campo Nome", () => {
    renderDialog({ field: null, fields: [] });
    openTypeSelect();

    const labels = optionLabels();
    expect(labels).toContain("Nome");
    expect(labels.indexOf("Nome")).toBe(labels.indexOf("Telefone") + 1);
  });

  it("cria campo do tipo Nome com type name e sem options", () => {
    renderDialog({ field: null, fields: [] });
    fireEvent.change(screen.getByLabelText("Label *"), {
      target: { value: "Nome completo" },
    });
    openTypeSelect();
    fireEvent.click(screen.getByRole("option", { name: "Nome" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({
      label: "Nome completo",
      type: "name",
      formId: "form-1",
      required: true,
      options: undefined,
      order: 0,
    });
  });

  it("mostra o texto de ajuda só quando o tipo selecionado é Nome", () => {
    renderDialog({ field: null, fields: [] });
    const helpText =
      "Usado como nome do inscrito (e no Pipedrive). Só um por formulário.";
    expect(screen.queryByText(helpText)).toBeNull();

    openTypeSelect();
    fireEvent.click(screen.getByRole("option", { name: "Nome" }));

    expect(screen.getByText(helpText)).toBeTruthy();
  });
});

describe("trava de um campo Nome por formulário", () => {
  it("esconde Nome ao criar campo quando o formulário já tem campo Nome", () => {
    renderDialog({ field: null, fields: [nameField()] });
    openTypeSelect();

    expect(optionLabels()).not.toContain("Nome");
    expect(
      screen.getByText("Este formulário já tem um campo Nome: Nome completo"),
    ).toBeTruthy();
  });

  it("esconde Nome ao trocar o tipo de outro campo quando o formulário já tem campo Nome", () => {
    renderDialog({ field: textField(), fields: [nameField(), textField()] });
    openTypeSelect();

    expect(optionLabels()).not.toContain("Nome");
    expect(
      screen.getByText("Este formulário já tem um campo Nome: Nome completo"),
    ).toBeTruthy();
  });

  it("mantém Nome disponível ao editar o próprio campo Nome", () => {
    renderDialog({ field: nameField(), fields: [nameField(), textField()] });
    openTypeSelect();

    expect(optionLabels()).toContain("Nome");
    expect(screen.queryByText(/Este formulário já tem um campo Nome/)).toBeNull();
  });
});

describe("erro do backend ao salvar", () => {
  it("no 400 mostra a mensagem do backend, recarrega os campos e mantém o diálogo aberto", () => {
    const MSG =
      'Este formulário já tem um campo Nome ("Nome completo"). Só é permitido um por formulário.';
    createMutate.mockImplementation((_input, opts) =>
      opts.onError(new ApiError(400, MSG)),
    );
    const onOpenChange = vi.fn();
    const { queryClient } = renderDialog({ onOpenChange });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.change(screen.getByLabelText("Label *"), {
      target: { value: "Nome completo" },
    });
    openTypeSelect();
    fireEvent.click(screen.getByRole("option", { name: "Nome" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(toast.error).toHaveBeenCalledWith(MSG);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["events", "evt-1", "form-fields"],
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
