import { CalendarDate, parseDate } from "@internationalized/date";

export type DateTimeMode = "datetime" | "date";

/** Parse a form string ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm") into the
 *  calendar date + a "HH:mm" time string. Bad/empty input → nulls. */
export function parseValue(
  value: string | undefined,
  mode: DateTimeMode,
): { date: CalendarDate | null; time: string } {
  if (!value) return { date: null, time: "" };
  const [datePart, timePart] = value.split("T");
  let date: CalendarDate | null = null;
  try {
    date = parseDate(datePart);
  } catch {
    date = null;
  }
  const time = mode === "datetime" ? (timePart?.slice(0, 5) ?? "") : "";
  return { date, time };
}

/** Combine calendar date + "HH:mm" time into the form string for the mode.
 *  Null date → "". datetime mode with empty time → defaults to 00:00. */
export function formatValue(
  date: CalendarDate | null,
  time: string,
  mode: DateTimeMode,
): string {
  if (!date) return "";
  const yyyy = String(date.year).padStart(4, "0");
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  const datePart = `${yyyy}-${mm}-${dd}`;
  if (mode === "date") return datePart;
  return `${datePart}T${time || "00:00"}`;
}
