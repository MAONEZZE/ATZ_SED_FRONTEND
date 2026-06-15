# DateTimePicker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all native date / datetime-local inputs (event start, event end, public form date field) with one reusable calendar-based `DateTimePicker`, keeping form schemas and persisted string formats unchanged.

**Architecture:** A `react-aria-components` calendar in a Popover + a native time input, wrapped by `DateTimePicker`. The wrapper is string-in / string-out via two pure helpers (`parseValue` / `formatValue`) so existing react-hook-form + zod schemas and the ISO `slice(0,16)` conversions need no changes. All three call sites use RHF `Controller`.

**Tech Stack:** Next.js, React, TypeScript, react-hook-form, zod, react-aria-components, @internationalized/date, Tailwind, vitest + @testing-library/react.

**Design doc:** `docs/plans/2026-06-15-datetime-picker-design.md`

---

## Conventions

- Run all commands from repo root: `/home/sanchezz/Desktop/ATZ/SED (save event date)/ATZ_SED_FRONTEND`.
- Test runner: `npm run test` (vitest run). Single file: `npx vitest run <path>`.
- The string contract:
  - `mode="datetime"` ↔ `"YYYY-MM-DDTHH:mm"` (same as `datetime-local`).
  - `mode="date"` ↔ `"YYYY-MM-DD"` (same as `type="date"`).

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

**Step 1: Install**

Run:
```bash
npm install react-aria-components @internationalized/date @radix-ui/react-icons
```
Expected: installs cleanly, lockfile updated. If a React peer-dep warning appears, note it but continue (vitest/build in later tasks confirm compatibility).

**Step 2: Verify versions present**

Run:
```bash
node -e "const d=require('./package.json').dependencies; console.log(d['react-aria-components'], d['@internationalized/date'], d['@radix-ui/react-icons'])"
```
Expected: three version strings, none `undefined`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add react-aria-components, internationalized/date, radix icons"
```

---

## Task 2: Pure parse/format helpers (TDD)

These hold all the risky logic. Unit-test them in isolation.

**Files:**
- Create: `lib/utils/date-time-picker.ts`
- Test: `lib/utils/date-time-picker.test.ts`

**Step 1: Write the failing test**

Create `lib/utils/date-time-picker.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { CalendarDate } from "@internationalized/date";
import { parseValue, formatValue } from "./date-time-picker";

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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/date-time-picker.test.ts`
Expected: FAIL — cannot resolve `./date-time-picker` / `parseValue is not a function`.

**Step 3: Write minimal implementation**

Create `lib/utils/date-time-picker.ts`:
```ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/date-time-picker.test.ts`
Expected: PASS (10 tests).

**Step 5: Commit**

```bash
git add lib/utils/date-time-picker.ts lib/utils/date-time-picker.test.ts
git commit -m "feat: add date-time picker parse/format helpers"
```

---

## Task 3: Add calendar-rac UI primitive

Verbatim from the integration spec — react-aria calendar styled with the project's tokens.

**Files:**
- Create: `components/ui/calendar-rac.tsx`

**Step 1: Create the file**

Create `components/ui/calendar-rac.tsx` with exactly the spec contents:
```tsx
"use client"

import { cn } from "@/lib/utils"
import { getLocalTimeZone, today } from "@internationalized/date"
import { ComponentProps } from "react"
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from "react-aria-components"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"

interface BaseCalendarProps {
  className?: string
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> &
  BaseCalendarProps

const CalendarHeader = () => (
  <header className="flex w-full items-center gap-1 pb-1">
    <Button
      slot="previous"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70"
    >
      <ChevronLeftIcon size={16} strokeWidth={2} />
    </Button>
    <HeadingRac className="grow text-center text-sm font-medium" />
    <Button
      slot="next"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:bg-accent hover:text-foreground focus:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70"
    >
      <ChevronRightIcon size={16} strokeWidth={2} />
    </Button>
  </header>
)

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone())

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-lg p-0 text-xs font-medium text-muted-foreground/80">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg border border-transparent p-0 text-sm font-normal text-foreground outline-offset-2 duration-150 [transition-property:color,background-color,border-radius,box-shadow] focus:outline-none data-[disabled]:pointer-events-none data-[unavailable]:pointer-events-none data-[focus-visible]:z-10 data-[hovered]:bg-accent data-[selected]:bg-primary data-[hovered]:text-foreground data-[selected]:text-primary-foreground data-[unavailable]:line-through data-[disabled]:opacity-30 data-[unavailable]:opacity-30 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70",
              // Range-specific styles
              isRange &&
                "data-[selected]:rounded-none data-[selection-end]:rounded-e-lg data-[selection-start]:rounded-s-lg data-[invalid]:bg-red-100 data-[selected]:bg-accent data-[selected]:text-foreground data-[invalid]:data-[selection-end]:[&:not([data-hover])]:bg-destructive data-[invalid]:data-[selection-start]:[&:not([data-hover])]:bg-destructive data-[selection-end]:[&:not([data-hover])]:bg-primary data-[selection-start]:[&:not([data-hover])]:bg-primary data-[invalid]:data-[selection-end]:[&:not([data-hover])]:text-destructive-foreground data-[invalid]:data-[selection-start]:[&:not([data-hover])]:text-destructive-foreground data-[selection-end]:[&:not([data-hover])]:text-primary-foreground data-[selection-start]:[&:not([data-hover])]:text-primary-foreground",
              // Today indicator styles
              date.compare(now) === 0 &&
                cn(
                  "after:pointer-events-none after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary",
                  isRange
                    ? "data-[selection-end]:[&:not([data-hover])]:after:bg-background data-[selection-start]:[&:not([data-hover])]:after:bg-background"
                    : "data-[selected]:after:bg-background",
                ),
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  )
}

const Calendar = ({ className, ...props }: CalendarProps) => {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  )
}

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  )
}

export { Calendar, RangeCalendar }
```

**Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `calendar-rac.tsx`. (`RangeCalendar` is unused for now — that's fine, it's an exported member, not a dead local.)

**Step 3: Commit**

```bash
git add components/ui/calendar-rac.tsx
git commit -m "feat: add react-aria calendar-rac ui primitive"
```

---

## Task 4: DateTimePicker component (TDD)

**Files:**
- Create: `components/ui/date-time-picker.tsx`
- Test: `components/ui/date-time-picker.test.tsx`

**Step 1: Write the failing test**

Create `components/ui/date-time-picker.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "./date-time-picker";

describe("DateTimePicker", () => {
  it("shows the formatted date+time on the trigger in datetime mode", () => {
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={() => {}} />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("15/06/2026");
    expect(screen.getByRole("button")).toHaveTextContent("14:30");
  });

  it("shows placeholder when empty", () => {
    render(
      <DateTimePicker value="" onChange={() => {}} placeholder="Selecionar" />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Selecionar");
  });

  it("emits a recombined string when the time changes", () => {
    const onChange = vi.fn();
    render(
      <DateTimePicker value="2026-06-15T14:30" mode="datetime" onChange={onChange} />,
    );
    const time = screen.getByDisplayValue("14:30");
    fireEvent.change(time, { target: { value: "09:15" } });
    expect(onChange).toHaveBeenCalledWith("2026-06-15T09:15");
  });

  it("renders no time input in date mode", () => {
    render(<DateTimePicker value="2026-06-15" mode="date" onChange={() => {}} />);
    expect(screen.queryByDisplayValue("00:00")).toBeNull();
    expect(document.querySelector('input[type="time"]')).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/date-time-picker.test.tsx`
Expected: FAIL — cannot resolve `./date-time-picker`.

**Step 3: Write minimal implementation**

Create `components/ui/date-time-picker.tsx`:
```tsx
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

  function handleDateSelect(next: DateValue | null) {
    onChange(formatValue((next as CalendarDate | null) ?? null, time, mode));
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
          <Calendar
            value={date ?? undefined}
            onChange={handleDateSelect}
          />
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/date-time-picker.test.tsx`
Expected: PASS (4 tests).

Note: if the react-aria `Calendar` errors under jsdom, the failing assertion will be unrelated to our logic — in that case wrap only the calendar render issue, but expect it to work since the tests don't open the popover.

**Step 5: Commit**

```bash
git add components/ui/date-time-picker.tsx components/ui/date-time-picker.test.tsx
git commit -m "feat: add DateTimePicker component"
```

---

## Task 5: Wire event start/end fields

**Files:**
- Modify: `components/events/event-form-fields.tsx:39-60`

**Step 1: Update imports**

At the top of `components/events/event-form-fields.tsx`, add `Controller` to the react-hook-form import and import the picker. Change line 3 and add an import:
```tsx
import { Controller, type UseFormReturn } from "react-hook-form";
```
Add after the existing component imports (e.g. after the `Label` import):
```tsx
import { DateTimePicker } from "@/components/ui/date-time-picker";
```

**Step 2: Replace the two datetime inputs**

Replace the `eventDate` block (lines 39-47) with:
```tsx
      <div className="space-y-2">
        <Label htmlFor="eventDate">Início</Label>
        <Controller
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <DateTimePicker
              id="eventDate"
              mode="datetime"
              disabled={disabled}
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>
```

Replace the `endDate` block (lines 49-60) with:
```tsx
      <div className="space-y-2">
        <Label htmlFor="endDate">Término</Label>
        <Controller
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <DateTimePicker
              id="endDate"
              mode="datetime"
              disabled={disabled}
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        {errors.endDate && (
          <p className="text-sm text-destructive">{errors.endDate.message}</p>
        )}
      </div>
```

**Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`register` is still used by other fields; `form.control` is valid on `UseFormReturn`.)

**Step 4: Commit**

```bash
git add components/events/event-form-fields.tsx
git commit -m "feat: use DateTimePicker for event start/end fields"
```

---

## Task 6: Wire public form date field

**Files:**
- Modify: `components/forms/form-fields-renderer.tsx:160-162`

**Step 1: Import the picker**

Add after the `Label` import (around line 12):
```tsx
import { DateTimePicker } from "@/components/ui/date-time-picker";
```

**Step 2: Replace the date input**

Replace the `field.type === "date"` block (lines 160-162):
```tsx
            {field.type === "date" && (
              <Input id={key} type="date" disabled={disabled} {...form.register(key)} />
            )}
```
with:
```tsx
            {field.type === "date" && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => (
                  <DateTimePicker
                    id={key}
                    mode="date"
                    disabled={disabled}
                    value={(rhf.value as string) ?? ""}
                    onChange={rhf.onChange}
                  />
                )}
              />
            )}
```
(`Controller` is already imported in this file.)

**Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

**Step 4: Commit**

```bash
git add components/forms/form-fields-renderer.tsx
git commit -m "feat: use DateTimePicker for public form date fields"
```

---

## Task 7: Full verification

**Step 1: Run the whole test suite**

Run: `npm run test`
Expected: PASS, including the new helper + component tests.

**Step 2: Lint + typecheck + build**

Run:
```bash
npm run lint && npx tsc --noEmit && npm run build
```
Expected: lint clean, no type errors, build succeeds. Fix anything build surfaces (e.g. react-aria SSR/"use client" issues) before continuing.

**Step 3: Manual smoke test**

Run: `npm run dev`, then verify in the browser:
- Create event → pick **Início** date in the calendar, set time → saves; reopen edit page → prefilled correctly (ISO round-trip).
- Set **Término** before **Início** → existing zod refine still shows the end-before-start error.
- Public registration form with a `date` field → calendar only, no time input; submits `YYYY-MM-DD`.

**Step 4: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: resolve DateTimePicker integration issues"
```

---

## Notes / out of scope

- `RangeCalendar` ships in `calendar-rac.tsx` but is unused — left in place verbatim per the spec; no range fields exist yet.
- The spec's placeholder `Component.tsx` (counter) and `demo.tsx` are intentionally not added.
- No schema, ISO-conversion, or display-formatter changes — the string contract is preserved end to end.
