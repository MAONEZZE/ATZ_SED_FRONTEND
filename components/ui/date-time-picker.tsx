"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ChevronDownIcon } from "lucide-react";
import type { CalendarDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  parseValue,
  formatValue,
  to12Hour,
  from12Hour,
  maskTimeInput,
  splitMaskedTime,
  type DateTimeMode,
  type Period,
} from "@/lib/utils/date-time-picker";

// react-aria-components é pesado; carrega só quando o calendário abre, mantendo
// o bundle das rotas (ex.: edição de evento) leve e a navegação rápida.
const Calendar = dynamic(
  () => import("@/components/ui/calendar-rac").then((m) => m.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] w-[252px] items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    ),
  },
);

export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  id,
  disabled = false,
  placeholder = "Selecionar data",
}: {
  value?: string;
  onChange: (v: string) => void;
  mode?: DateTimeMode;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { date, time } = parseValue(value, mode);

  function handleDateSelect(next: DateValue | readonly DateValue[] | null) {
    const single = Array.isArray(next) ? next[0] : next;
    onChange(formatValue((single as CalendarDate | null) ?? null, time, mode));
    setOpen(false);
  }

  const { hour, minute, period } = to12Hour(time);

  // Texto livre do campo "hh:mm" enquanto o usuário digita — só sincroniza com
  // o valor canônico (padded) quando o campo não está focado, senão o
  // re-render a cada tecla sobrescreve o meio da digitação.
  const [rawTime, setRawTime] = React.useState(hour && minute ? `${hour}:${minute}` : "");
  const [timeFocused, setTimeFocused] = React.useState(false);

  React.useEffect(() => {
    if (!timeFocused) setRawTime(hour && minute ? `${hour}:${minute}` : "");
  }, [hour, minute, timeFocused]);

  function commitTime(nextHour: string, nextMinute: string, nextPeriod: Period) {
    onChange(formatValue(date, from12Hour(nextHour, nextMinute, nextPeriod), mode));
  }

  function handleTimeInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRawTime(maskTimeInput(e.target.value));
  }

  function handleTimeBlur() {
    setTimeFocused(false);
    const { hour: h, minute: m } = splitMaskedTime(rawTime);
    if (h || m) commitTime(h, m, period);
  }

  const dd = date ? String(date.day).padStart(2, "0") : "";
  const mm = date ? String(date.month).padStart(2, "0") : "";
  const label = date ? `${dd}/${mm}/${date.year}` : placeholder;

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className="flex-1 justify-between font-normal"
          >
            <span className={date ? "" : "text-muted-foreground"}>{label}</span>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-2" align="start">
          <Calendar value={date ?? undefined} onChange={handleDateSelect} />
        </PopoverContent>
      </Popover>
      {mode === "datetime" && (
        <div className="flex items-center gap-1">
          <Input
            type="text"
            inputMode="numeric"
            aria-label="Horário"
            placeholder="hh:mm"
            value={rawTime}
            disabled={disabled}
            onFocus={() => setTimeFocused(true)}
            onChange={handleTimeInputChange}
            onBlur={handleTimeBlur}
            className="w-16 text-center"
          />
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              aria-label="AM"
              aria-pressed={period === "AM"}
              disabled={disabled}
              onClick={() => commitTime(hour, minute, "AM")}
              className={`px-2 py-2 text-xs font-medium ${
                period === "AM"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              aria-label="PM"
              aria-pressed={period === "PM"}
              disabled={disabled}
              onClick={() => commitTime(hour, minute, "PM")}
              className={`px-2 py-2 text-xs font-medium ${
                period === "PM"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              PM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
