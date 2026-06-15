# DateTimePicker — Replace native date inputs

Date: 2026-06-15

## Goal

Replace all native date / datetime-local inputs with a single reusable
calendar-based picker built on `react-aria-components`, without changing the
existing form schemas, validation, or persisted data format.

## Current state

Three date input spots, all native HTML inputs wired to react-hook-form + zod:

| File | Field | Current input | Stored form value |
|---|---|---|---|
| `components/events/event-form-fields.tsx` | `eventDate` ("Início") | `datetime-local` | `"YYYY-MM-DDTHH:mm"` |
| `components/events/event-form-fields.tsx` | `endDate` ("Término") | `datetime-local` | `"YYYY-MM-DDTHH:mm"` |
| `components/forms/form-fields-renderer.tsx:161` | dynamic `date` field | `type="date"` | `"YYYY-MM-DD"` |

- Form lib: `react-hook-form` v7.77 + `@hookform/resolvers` + `zod`.
- `event-schema.ts`: `eventDate`/`endDate` optional strings, cross-field refine
  (`endDate` must be after `eventDate`).
- `app/(dashboard)/events/[id]/edit/page.tsx`: converts ISO → `datetime-local`
  via `new Date(x).toISOString().slice(0,16)` and back to ISO on submit.
- `date-fns` installed but unused. No calendar lib, no `/components/ui/calendar*`.
  `Popover` already exists in `/components/ui`.

## Decisions

- Build + wire all 3 spots.
- Dynamic public form date field stays **date-only** (no time).
- Event start/end use **minute** precision (HH:MM), matching current behavior.

## Approach (chosen: single wrapper, `mode` prop)

Rejected: two separate components (duplicated glue); keeping `register` (react-aria
Calendar is not a native input — needs controlled value via `Controller`).

### New files in `/components/ui`

- `calendar-rac.tsx` — react-aria calendar, verbatim from integration spec.
- `date-time-picker.tsx` — wrapper component.

The spec's placeholder `Component.tsx` (counter) is discarded; the real pattern
is the `Calendar24` demo (popover calendar + time input).

### Dependencies to add

`react-aria-components`, `@internationalized/date`, `@radix-ui/react-icons`.
(`@radix-ui/react-popover`, `@radix-ui/react-slot`, `class-variance-authority`,
`@radix-ui/react-label` already present.)

### Component contract — string in / string out

```ts
props: {
  value?: string
  onChange: (v: string) => void
  mode?: "datetime" | "date"   // default "datetime"
  id?: string
  disabled?: boolean
  placeholder?: string
}
```

- `mode="datetime"` → emits `"YYYY-MM-DDTHH:mm"` (identical to `datetime-local`,
  so ISO conversion in edit/create pages stays untouched).
- `mode="date"` → emits `"YYYY-MM-DD"` (identical to `type="date"`).
- Internal state: incoming string parsed → `CalendarDate` (via
  `@internationalized/date`) for popover calendar + `"HH:mm"` for a native
  `<input type="time">` (minute step). Calendar select or time change →
  recombine → `onChange`.
- Empty / unparseable value → blank picker showing placeholder, no crash.
- Time changed before a date is picked → ignored until date selected.

### Wiring

All three via RHF `Controller`, passing `field.value` / `field.onChange`:

- `event-form-fields.tsx`: `eventDate` and `endDate` → `mode="datetime"`.
- `form-fields-renderer.tsx:161`: dynamic date field → `mode="date"`.

### Unchanged

`event-schema.ts`, edit/create ISO `slice(0,16)` conversion, display formatters,
public registration zod schema (still strings).

## Data flow

Backend ISO string ↔ form holds `YYYY-MM-DDTHH:mm` (or `YYYY-MM-DD`) ↔ component
parses/recombines. Same string contract through the whole chain → zero ripple.

## Error handling

- Unparseable/empty → blank picker.
- Time without date → ignored.
- `endDate` end-before-start still flagged by existing zod refine.

## Testing

Manual run: create event with start+end, edit existing event (prefill correct),
submit public form with a date field. No existing automated test suite for these.
