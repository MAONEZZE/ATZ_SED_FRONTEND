# Pagination Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all list-endpoint consumers to the new paginated response shape `{ data, total, page, limit }` and add pagination UI where the dataset can grow large.

**Architecture:** Add a `PaginatedResponse<T>` generic type, update every list hook to accept optional `page`/`limit` params and return the paginated envelope, update query keys to include those params, then update each page. Large-dataset views (events, registrations, message logs) get prev/next pagination controls. Small, bounded datasets (form-fields, per-event templates/automations) use `limit=100` and skip pagination UI.

**Tech Stack:** Next.js 14 App Router, TanStack Query v5, TypeScript, shadcn/ui, Tailwind CSS

---

### Task 1: Add `PaginatedResponse<T>` type

**Files:**
- Modify: `lib/api/types.ts`

**Step 1: Add the generic type at the bottom of types.ts**

```typescript
/** Envelope paginado retornado por todos os endpoints de listagem */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

**Step 2: Build the project to verify no type errors**

```bash
cd "/home/sanchezz/Desktop/ATZ/SED (save event date)/ATZ_SED_FRONTEND"
npx tsc --noEmit
```
Expected: exits 0 (or only pre-existing errors — adding a type can't break anything)

**Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(types): add PaginatedResponse<T> generic envelope"
```

---

### Task 2: Update `useEvents` hook — events list

**Files:**
- Modify: `lib/api/events.ts`
- Modify: `lib/api/query-keys.ts`

**Step 1: Update `queryKeys.events` to be a function that accepts pagination params**

In `lib/api/query-keys.ts`, change:
```typescript
// Before
events: ["events"] as const,
```
```typescript
// After
events: (params?: { page?: number; limit?: number }) =>
  params ? (["events", params] as const) : (["events"] as const),
```

**Step 2: Update all callers of `queryKeys.events` in `lib/api/events.ts`**

`useEvents` → becomes:
```typescript
export function useEvents(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.events({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<EventObject>>(`/events?page=${page}&limit=${limit}`),
  });
}
```

`useInvalidateEvents` → invalidate the base key `["events"]` to bust all paginated variants:
```typescript
function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
  };
}
```

Also add the import at top of `events.ts`:
```typescript
import type { EventObject, EventStatus, PaginatedResponse } from "@/lib/api/types";
```

**Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/api/events.ts lib/api/query-keys.ts
git commit -m "feat(api): paginate useEvents hook"
```

---

### Task 3: Update events list page with pagination UI

**Files:**
- Modify: `app/(dashboard)/events/page.tsx`

**Step 1: Add pagination state and update data access**

Replace the top of `EventsPage`:
```typescript
export default function EventsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: response, isLoading, isError, refetch, isRefetching } = useEvents(page, limit);
  const events = response?.data;
  const totalPages = response ? Math.ceil(response.total / limit) : 0;
```

Add `useState` to imports at the top:
```typescript
import { useState } from "react";
```

**Step 2: Update the empty-state check**

Change `events && events.length === 0` → `response && events?.length === 0`

**Step 3: Add pagination controls at the bottom (after the grid)**

```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
    >
      Anterior
    </Button>
    <span className="text-sm text-muted-foreground">
      {page} / {totalPages}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      disabled={page === totalPages}
    >
      Próxima
    </Button>
  </div>
)}
```

**Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/\(dashboard\)/events/page.tsx
git commit -m "feat(events): add pagination controls to events list"
```

---

### Task 4: Update `useRegistrations` hook — move search to server-side

**Files:**
- Modify: `lib/api/registrations.ts`
- Modify: `lib/api/query-keys.ts`

**Step 1: Update `queryKeys.registrations` to include page, limit, search**

```typescript
// Before
registrations: (eventId: string, status?: string) =>
  status
    ? (["events", eventId, "registrations", { status }] as const)
    : (["events", eventId, "registrations"] as const),
```
```typescript
// After
registrations: (eventId: string, params?: { status?: string; search?: string; page?: number; limit?: number }) =>
  params
    ? (["events", eventId, "registrations", params] as const)
    : (["events", eventId, "registrations"] as const),
```

**Step 2: Update `useRegistrations` signature and queryFn**

```typescript
import type { FunnelStatus, PaginatedResponse, Registration } from "@/lib/api/types";

export function useRegistrations(
  eventId: string,
  params: { status?: FunnelStatus; search?: string; page?: number; limit?: number } = {},
) {
  const { status, search, page = 1, limit = 30 } = params;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.registrations(eventId, params),
    queryFn: () =>
      api.get<PaginatedResponse<Registration>>(
        `/events/${eventId}/registrations?${qs.toString()}`,
      ),
    enabled: Boolean(eventId),
  });
}
```

**Step 3: Fix the invalidation in `useUpdateRegistrationStatus`**

It already uses `["events", eventId, "registrations"]` as a partial key — this still works because TanStack Query invalidates all matching prefixes. No change needed.

**Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add lib/api/registrations.ts lib/api/query-keys.ts
git commit -m "feat(api): paginate useRegistrations, move search to server-side"
```

---

### Task 5: Update attendees page — use server-side search + pagination

**Files:**
- Modify: `app/(dashboard)/events/[id]/attendees/page.tsx`

**Step 1: Remove client-side `useMemo` filter, add page state, update hook call**

Replace the hook call and related state:
```typescript
const [page, setPage] = useState(1);
const limit = 30;

const { data: response, isLoading } = useRegistrations(eventId, {
  status: statusFilter === ALL ? undefined : (statusFilter as FunnelStatus),
  search: search.trim() || undefined,
  page,
  limit,
});

const registrations = response?.data ?? [];
const totalPages = response ? Math.ceil(response.total / limit) : 0;
```

Remove the `useMemo` import usage for filtering (keep `useMemo` import only if used elsewhere).

**Step 2: Reset page to 1 when filters change**

Add a `useEffect`:
```typescript
useEffect(() => {
  setPage(1);
}, [statusFilter, search]);
```

Add `useEffect` to the React imports.

**Step 3: Replace `filtered` references with `registrations`**

All occurrences of `filtered` → `registrations`.

**Step 4: Add pagination controls at the bottom (before `<AttendeeDetailSheet>`)**

```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
    >
      Anterior
    </Button>
    <span className="text-sm text-muted-foreground">
      {page} / {totalPages}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      disabled={page === totalPages}
    >
      Próxima
    </Button>
  </div>
)}
```

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add app/\(dashboard\)/events/\[id\]/attendees/page.tsx
git commit -m "feat(attendees): server-side search+pagination for registrations"
```

---

### Task 6: Update `useFormFields` — use high limit, no pagination UI

**Files:**
- Modify: `lib/api/form-fields.ts`

**Step 1: Update `useFormFields` return type**

```typescript
import type { FieldType, FormField, PaginatedResponse } from "@/lib/api/types";

export function useFormFields(eventId: string) {
  return useQuery({
    queryKey: queryKeys.formFields(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<FormField>>(
        `/events/${eventId}/form-fields?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}
```

> Unwrapping inside `queryFn` keeps callers unchanged — they still get `FormField[]`.

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/api/form-fields.ts
git commit -m "feat(api): unwrap paginated response in useFormFields (limit=100)"
```

---

### Task 7: Update `useTemplates` and `useTemplatesWithAutomation` — high limit, no pagination UI

**Files:**
- Modify: `lib/api/templates.ts`

**Step 1: Update both hooks to unwrap inside queryFn**

```typescript
import type {
  MessageChannel,
  MessageTemplate,
  MessageTemplateWithAutomation,
  PaginatedResponse,
} from "@/lib/api/types";

export function useTemplates(eventId: string) {
  return useQuery({
    queryKey: queryKeys.templates(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MessageTemplate>>(
        `/events/${eventId}/templates?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useTemplatesWithAutomation(eventId: string) {
  return useQuery({
    queryKey: [...queryKeys.templates(eventId), { include: "automation" }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MessageTemplateWithAutomation>>(
        `/events/${eventId}/templates?include=automation&limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/api/templates.ts
git commit -m "feat(api): unwrap paginated response in useTemplates (limit=100)"
```

---

### Task 8: Update `useAutomations` — high limit, no pagination UI

**Files:**
- Modify: `lib/api/automations.ts`

**Step 1: Update hook to unwrap inside queryFn**

```typescript
import type { Automation, AutomationTrigger, PaginatedResponse } from "@/lib/api/types";

export function useAutomations(eventId: string) {
  return useQuery({
    queryKey: queryKeys.automations(eventId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Automation>>(
        `/events/${eventId}/automations?limit=100`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/api/automations.ts
git commit -m "feat(api): unwrap paginated response in useAutomations (limit=100)"
```

---

### Task 9: Update `useMessageLogs` (per-event) — paginated

**Files:**
- Modify: `lib/api/messaging.ts`
- Modify: `lib/api/query-keys.ts`

**Step 1: Update `queryKeys.messageLogs` to accept pagination params**

```typescript
messageLogs: (eventId: string, params?: { page?: number; limit?: number }) =>
  params
    ? (["events", eventId, "message-logs", params] as const)
    : (["events", eventId, "message-logs"] as const),
```

**Step 2: Update `useMessageLogs`**

```typescript
import type { MessageLog, PaginatedResponse, SendMessageInput, SendMessageResult } from "@/lib/api/types";

export function useMessageLogs(eventId: string, page = 1, limit = 30) {
  return useQuery({
    queryKey: queryKeys.messageLogs(eventId, { page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<MessageLog>>(
        `/events/${eventId}/messaging/logs?page=${page}&limit=${limit}`,
      ),
    enabled: Boolean(eventId),
  });
}
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/api/messaging.ts lib/api/query-keys.ts
git commit -m "feat(api): paginate useMessageLogs hook"
```

---

### Task 10: Update global messaging hooks — paginated

**Files:**
- Modify: `lib/api/global-messaging.ts`
- Modify: `lib/api/query-keys.ts`

**Step 1: Update `queryKeys.allTemplates`, `allAutomations`, `allMessageLogs` to be functions**

```typescript
// Before
allTemplates: ["global", "templates"] as const,
allAutomations: ["global", "automations"] as const,
allMessageLogs: ["global", "message-logs"] as const,
```
```typescript
// After
allTemplates: (params?: { page?: number; limit?: number }) =>
  params ? (["global", "templates", params] as const) : (["global", "templates"] as const),
allAutomations: (params?: { page?: number; limit?: number }) =>
  params ? (["global", "automations", params] as const) : (["global", "automations"] as const),
allMessageLogs: (params?: { page?: number; limit?: number }) =>
  params ? (["global", "message-logs", params] as const) : (["global", "message-logs"] as const),
```

**Step 2: Update the three global query hooks in `lib/api/global-messaging.ts`**

```typescript
import type {
  AutomationWithEvent,
  MessageLogWithEvent,
  PaginatedResponse,
  TemplateWithEvent,
} from "@/lib/api/types";

export function useAllTemplates(page = 1, limit = 50) {
  return useQuery({
    queryKey: queryKeys.allTemplates({ page, limit }),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TemplateWithEvent>>(
        `/templates?page=${page}&limit=${limit}`,
      );
      return res.data;
    },
  });
}

export function useAllAutomations(page = 1, limit = 50) {
  return useQuery({
    queryKey: queryKeys.allAutomations({ page, limit }),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AutomationWithEvent>>(
        `/automations?page=${page}&limit=${limit}`,
      );
      return res.data;
    },
  });
}

export function useAllMessageLogs(page = 1, limit = 30) {
  return useQuery({
    queryKey: queryKeys.allMessageLogs({ page, limit }),
    queryFn: () =>
      api.get<PaginatedResponse<MessageLogWithEvent>>(
        `/messaging/logs?page=${page}&limit=${limit}`,
      ),
  });
}
```

> `useAllTemplates` and `useAllAutomations` unwrap inside `queryFn` (data returned is `T[]` still) — callers don't need to change. `useAllMessageLogs` returns the full `PaginatedResponse<MessageLogWithEvent>` so the logs page can show total count and paginate.

**Step 3: Update `useInvalidateGlobal` — still invalidates by prefix `["global"]`, no change needed**

**Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add lib/api/global-messaging.ts lib/api/query-keys.ts
git commit -m "feat(api): paginate global messaging hooks"
```

---

### Task 11: Update messages page — logs tab pagination

**Files:**
- Modify: `app/(dashboard)/messages/page.tsx`

The `TemplatesTab` and `AutomationsTab` already get `T[]` from the updated hooks (unwrapped in queryFn). Only `LogsTab` needs changes because `useAllMessageLogs` now returns `PaginatedResponse<MessageLogWithEvent>`.

**Step 1: Update `LogsTab` component**

```typescript
function LogsTab() {
  const [page, setPage] = useState(1);
  const limit = 30;
  const { data: response, isLoading } = useAllMessageLogs(page, limit);
  const logs = response?.data;
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <TabToolbar left={response ? `${response.total} mensagem(ns)` : null} />
      {/* ... existing table JSX unchanged ... */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
```

Add `useState` import (already likely present).

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/\(dashboard\)/messages/page.tsx
git commit -m "feat(messages): add pagination to global message logs tab"
```

---

### Task 12: Final verification

**Step 1: Full type check**

```bash
cd "/home/sanchezz/Desktop/ATZ/SED (save event date)/ATZ_SED_FRONTEND"
npx tsc --noEmit
```
Expected: 0 errors

**Step 2: Build check**

```bash
npm run build
```
Expected: successful build

**Step 3: Verify no remaining raw array usages of paginated endpoints**

```bash
grep -rn "api\.get<EventObject\[\]>" lib/
grep -rn "api\.get<Registration\[\]>" lib/
grep -rn "api\.get<MessageLog\[\]>" lib/
grep -rn "api\.get<FormField\[\]>" lib/
grep -rn "api\.get<MessageTemplate\[\]>" lib/
grep -rn "api\.get<Automation\[\]>" lib/
```
Expected: no matches

**Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "fix: clean up any remaining raw array consumers after pagination migration"
```

---

## Summary of changes

| File | Change |
|------|--------|
| `lib/api/types.ts` | Add `PaginatedResponse<T>` |
| `lib/api/query-keys.ts` | Add pagination params to `events`, `registrations`, `messageLogs`, `allTemplates`, `allAutomations`, `allMessageLogs` keys |
| `lib/api/events.ts` | `useEvents(page, limit)` → returns `PaginatedResponse<EventObject>` |
| `lib/api/registrations.ts` | `useRegistrations(eventId, params)` → accepts search+page+limit, returns `PaginatedResponse<Registration>` |
| `lib/api/form-fields.ts` | `useFormFields` unwraps in queryFn, returns `FormField[]` unchanged |
| `lib/api/templates.ts` | Both hooks unwrap in queryFn, return `MessageTemplate[]` unchanged |
| `lib/api/automations.ts` | `useAutomations` unwraps in queryFn, returns `Automation[]` unchanged |
| `lib/api/messaging.ts` | `useMessageLogs(eventId, page, limit)` → returns `PaginatedResponse<MessageLog>` |
| `lib/api/global-messaging.ts` | Global list hooks paginated; templates+automations unwrap, logs expose full response |
| `app/(dashboard)/events/page.tsx` | Add page state, use `response.data`, pagination controls |
| `app/(dashboard)/events/[id]/attendees/page.tsx` | Server-side search, add page state, pagination controls, remove client-side filter |
| `app/(dashboard)/messages/page.tsx` | LogsTab uses `response.data` + pagination controls |
