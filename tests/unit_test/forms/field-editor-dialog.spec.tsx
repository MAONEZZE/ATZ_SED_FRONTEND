import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FormField } from "@/lib/api/types";

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
});
