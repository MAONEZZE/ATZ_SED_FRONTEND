import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DateTimePicker } from "@/components/ui/date-time-picker";

afterEach(() => cleanup());

describe("DateTimePicker", () => {
  it("shows the formatted date+time on the trigger in datetime mode", () => {
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={() => {}} />,
    );
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("15/06/2026");
    expect(btn.textContent).toContain("14:30");
  });

  it("shows placeholder when empty", () => {
    render(
      <DateTimePicker value="" onChange={() => {}} placeholder="Selecionar" />,
    );
    expect(screen.getByRole("button").textContent).toContain("Selecionar");
  });

  it("emits a recombined string when the time changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={onChange} />,
    );
    const time = container.querySelector('input[type="time"]') as HTMLInputElement;
    expect(time.value).toBe("14:30");
    fireEvent.change(time, { target: { value: "09:15" } });
    expect(onChange).toHaveBeenCalledWith("2026-06-15T09:15");
  });

  it("renders no time input in date mode", () => {
    const { container } = render(
      <DateTimePicker value="2026-06-15" mode="date" onChange={() => {}} />,
    );
    expect(container.querySelector('input[type="time"]')).toBeNull();
  });
});
