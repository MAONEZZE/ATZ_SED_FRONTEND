"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import type { CalendarDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar-rac";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  parseValue,
  formatValue,
  type DateTimeMode,
} from "@/lib/utils/date-time-picker";

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
    onChange(
      formatValue((single as CalendarDate | null) ?? null, time, mode),
    );
    setOpen(false);
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatValue(date, e.target.value, mode));
  }

  const dd = date ? String(date.day).padStart(2, "0") : "";
  const mm = date ? String(date.month).padStart(2, "0") : "";
  const label = date
    ? mode === "datetime"
      ? `${dd}/${mm}/${date.year}${time ? ` ${time}` : ""}`
      : `${dd}/${mm}/${date.year}`
    : placeholder;

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
        <Input
          type="time"
          aria-label="Hora"
          value={time}
          disabled={disabled}
          onChange={handleTimeChange}
          className="w-32 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      )}
    </div>
  );
}
