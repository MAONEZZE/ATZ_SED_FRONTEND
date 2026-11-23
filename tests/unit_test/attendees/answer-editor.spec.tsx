import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AnswerEditor } from "@/components/attendees/answer-editor";

vi.mock("@/lib/api/form-fields", () => ({ uploadRegistrationDocument: vi.fn() }));

afterEach(() => cleanup());

describe("AnswerEditor", () => {
  it("edita resposta de campo Nome em input de texto", () => {
    const onChange = vi.fn();
    render(
      <AnswerEditor
        field={{
          id: "fld-name",
          formId: "form-1",
          label: "Nome completo",
          type: "name",
          required: true,
          options: null,
          order: 0,
          isFixed: false,
          createdAt: "",
        }}
        value="Ana"
        onChange={onChange}
        eventId="evt-1"
      />,
    );

    expect((screen.getByDisplayValue("Ana") as HTMLInputElement).type).toBe("text");

    fireEvent.change(screen.getByDisplayValue("Ana"), { target: { value: "Bia" } });

    expect(onChange).toHaveBeenCalledWith("Bia");
  });
});
