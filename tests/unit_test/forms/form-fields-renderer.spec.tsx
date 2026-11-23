import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import type { PublicFormField } from "@/lib/api/types";

afterEach(() => cleanup());

function Harness({ fields }: { fields: PublicFormField[] }) {
  const form = useForm<Record<string, unknown>>();
  return <FormFieldsRenderer fields={fields} form={form} />;
}

describe("FormFieldsRenderer", () => {
  it("renderiza campo Nome como input de texto com label e marcador de obrigatório", () => {
    render(
      <Harness
        fields={[
          { id: "1", label: "Nome completo", type: "name", required: true, options: null, order: 0 },
        ]}
      />,
    );

    const input = document.getElementById("f_1");
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).type).toBe("text");
    expect(screen.getByText("Nome completo")).toBeTruthy();
    expect(screen.getByText("*")).toBeTruthy();
  });
});
