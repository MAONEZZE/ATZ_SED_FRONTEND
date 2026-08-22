import { CalendarDate, parseDate } from "@internationalized/date";

export type DateTimeMode = "datetime" | "date";

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

export type Period = "AM" | "PM";

/** Converte "HH:mm" (24h) em partes 12h para exibição/edição no time field. */
export function to12Hour(time: string): { hour: string; minute: string; period: Period } {
  if (!time) return { hour: "", minute: "", period: "AM" };
  const [hStr, mStr] = time.split(":");
  const h24 = Number(hStr);
  const period: Period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: String(h12).padStart(2, "0"), minute: (mStr ?? "00").padStart(2, "0"), period };
}

/** Converte partes 12h de volta para "HH:mm" (24h) usado internamente. */
export function from12Hour(hour: string, minute: string, period: Period): string {
  let h12 = Number(hour);
  if (!Number.isFinite(h12) || h12 <= 0) h12 = 12;
  if (h12 > 12) h12 = 12;
  let h24 = h12 % 12;
  if (period === "PM") h24 += 12;
  const m = Math.min(59, Math.max(0, Number(minute) || 0));
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Aplica a máscara "hh:mm" enquanto o usuário digita num campo único. */
export function maskTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Extrai {hour, minute} (strings, possivelmente parciais) do texto mascarado. */
export function splitMaskedTime(masked: string): { hour: string; minute: string } {
  const digits = masked.replace(/\D/g, "").slice(0, 4);
  return { hour: digits.slice(0, 2), minute: digits.slice(2, 4) };
}
