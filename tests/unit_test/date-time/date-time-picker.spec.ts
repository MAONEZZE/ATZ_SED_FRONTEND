import { describe, it, expect } from "vitest";
import { CalendarDate } from "@internationalized/date";
import { parseValue, formatValue } from "@/lib/utils/date-time-picker";

describe("parseValue", () => {
  it("parses a datetime string into date + time", () => {
    const { date, time } = parseValue("2026-06-15T14:30", "datetime");
    expect(date).not.toBeNull();
    expect(date!.year).toBe(2026);
    expect(date!.month).toBe(6);
    expect(date!.day).toBe(15);
    expect(time).toBe("14:30");
  });

  it("parses a date-only string and ignores time in date mode", () => {
    const { date, time } = parseValue("2026-06-15", "date");
    expect(date!.day).toBe(15);
    expect(time).toBe("");
  });

  it("returns nulls for empty input", () => {
    expect(parseValue(undefined, "datetime")).toEqual({ date: null, time: "" });
    expect(parseValue("", "date")).toEqual({ date: null, time: "" });
  });

  it("returns null date for unparseable input", () => {
    expect(parseValue("not-a-date", "datetime").date).toBeNull();
  });
});

describe("formatValue", () => {
  const d = new CalendarDate(2026, 6, 15);

  it("formats datetime with time", () => {
    expect(formatValue(d, "14:30", "datetime")).toBe("2026-06-15T14:30");
  });

  it("defaults missing time to 00:00 in datetime mode", () => {
    expect(formatValue(d, "", "datetime")).toBe("2026-06-15T00:00");
  });

  it("formats date-only mode without time", () => {
    expect(formatValue(d, "14:30", "date")).toBe("2026-06-15");
  });

  it("pads single-digit month/day", () => {
    expect(formatValue(new CalendarDate(2026, 1, 5), "09:00", "datetime")).toBe(
      "2026-01-05T09:00",
    );
  });

  it("returns empty string for null date", () => {
    expect(formatValue(null, "14:30", "datetime")).toBe("");
  });
});
