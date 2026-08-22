import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DateTimePicker } from "@/components/ui/date-time-picker";

afterEach(() => cleanup());

describe("DateTimePicker", () => {
  it("shows only the date on the trigger, never the time, in datetime mode", () => {
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={() => {}} />,
    );
    const dateBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("15/06/2026"))!;
    expect(dateBtn.textContent).toContain("15/06/2026");
    expect(dateBtn.textContent).not.toContain("14:30");
    expect(dateBtn.textContent).not.toContain("2:30");
  });

  it("shows placeholder when empty", () => {
    render(<DateTimePicker value="" onChange={() => {}} placeholder="Selecionar" />);
    const dateBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Selecionar"))!;
    expect(dateBtn).toBeDefined();
  });

  it("shows the time as a single hh:mm field, in 12h format", () => {
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={() => {}} />,
    );
    const timeInput = screen.getByLabelText("Horário") as HTMLInputElement;
    expect(timeInput.value).toBe("02:30");
    expect(
      screen.getByRole("button", { name: "PM" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("emits a recombined string when the time field is edited and blurred", () => {
    const onChange = vi.fn();
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={onChange} />,
    );
    const timeInput = screen.getByLabelText("Horário") as HTMLInputElement;
    // Período (PM) é mantido — só os dígitos de hora/minuto mudaram.
    fireEvent.change(timeInput, { target: { value: "0915" } });
    fireEvent.blur(timeInput);
    expect(onChange).toHaveBeenCalledWith("2026-06-15T21:15");
  });

  it("emits a recombined string when AM/PM is toggled", () => {
    const onChange = vi.fn();
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "AM" }));
    expect(onChange).toHaveBeenCalledWith("2026-06-15T02:30");
  });

  it("renders no time field in date mode", () => {
    render(<DateTimePicker value="2026-06-15" mode="date" onChange={() => {}} />);
    expect(screen.queryByLabelText("Horário")).toBeNull();
  });
});
