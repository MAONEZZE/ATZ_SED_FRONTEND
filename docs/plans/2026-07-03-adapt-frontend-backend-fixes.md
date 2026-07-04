# Adaptação do frontend às correções do backend (feat/limpeza_profunda) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajustar o frontend (ATZ_SED_FRONTEND) para tirar proveito e ficar coerente com os 23 bugs corrigidos no backend (branch `feat/limpeza_profunda`), sem quebrar nada que já funciona.

**Architecture:** Cada task é isolada por arquivo/feature. Filtros de listagem (form-fields, templates) trocam workaround client-side por query param real agora suportado. Validações client-side (select/multiselect, subject, delayMinutes, name) passam a espelhar as novas validações do backend, evitando round-trip de erro 400. Locks de status `ended` e enum `after_approval` replicam padrões já existentes no código (`edit/page.tsx`, `DELAYED_TRIGGERS`).

**Tech Stack:** Next.js 14 (App Router), React 18, TanStack Query, react-hook-form + zod, TypeScript.

**Investigação prévia (não repetir):**
- Confirmado via `grep` no backend (`app/modules/automations/dto/automation.dto.ts`) que `after_approval` já está no `@IsIn` do `CreateAutomationDto` (8 valores) — a doc estática `docs/backend-api-contracts.md:26,30` está desatualizada (foi gerada antes deste fix no mesmo dia). Confiar no código do backend, não na doc.
- Confirmado via `scheduled-automations.worker.ts:52-54,117` que `after_approval` é processado pelo mesmo worker de `before_event`/`after_event` e usa `delayMinutes` (`delayMs = rule.delayMinutes * 60000`) — **é um trigger com delay**, precisa entrar em `DELAYED_TRIGGERS`.
- `lib/api/registrations.ts` e `lib/api/user-subscriptions.ts` (listagem de inscritos) já mandam `status`/`search`/`format=csv` corretamente — o bug era 100% backend (sempre 400), nenhuma mudança de frontend necessária aí.
- `POST /profile` (ensure) e `PATCH /profile/me` → `evolutionInstance` já são tratados corretamente no frontend (resposta ignorada / `|| undefined` já omite string vazia) — sem ação.
- `usePostEventResponses`/`exportPostEventResponsesCsv` em `lib/api/form-fields.ts:77-96` não têm nenhum caller — dead code do endpoint `/events/:eventId/post-event-responses`, que nunca foi de fato usado pela UI (a aba "Pós-evento" usa `user-subscriptions`). Removidos na Task 1 por estarem no mesmo arquivo.
- `useTemplates` em `lib/api/templates.ts:35-46` não tem nenhum caller e chama uma rota que não existe (`/events/:eventId/templates`) — dead code, removido na Task 2.

---

### Task 1: `form-fields` — usar `?kind=` do backend em vez de filtro client-side

**Files:**
- Modify: `lib/api/form-fields.ts:19-31,77-96`

**Step 1: Trocar filtro client-side por query param**

```ts
export function useFormFields(eventId: string, kind?: FormFieldKind) {
  return useQuery({
    queryKey: queryKeys.formFields(eventId, kind),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "100" });
      if (kind) qs.set("kind", kind);
      const res = await api.get<PaginatedResponse<FormField>>(
        `/events/${eventId}/form-fields?${qs.toString()}`,
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}
```

Remova o `select: kind ? (data) => data.filter(...) : undefined` — não é mais necessário.

**Step 2: Ajustar `queryKeys.formFields` para aceitar `kind`**

Abra `lib/api/query-keys.ts`, ache `formFields` e inclua `kind` na key (senão duas chamadas com `kind` diferente compartilham cache):

```ts
formFields: (eventId: string, kind?: string) =>
  ["events", eventId, "form-fields", kind] as const,
```

Verifique todos os callers de `queryKeys.formFields(...)` (grep) e ajuste as invalidações em `lib/api/form-fields.ts` (`useCreateFormField`/`useUpdateFormField`/`useDeleteFormField`/`useReorderFormFields`) — como agora a key inclui `kind`, troque `invalidateQueries({ queryKey: queryKeys.formFields(eventId) })` por `invalidateQueries({ queryKey: ["events", eventId, "form-fields"] })` (prefixo parcial invalida todas as variantes de `kind`).

**Step 3: Remover dead code do endpoint não usado**

Delete de `lib/api/form-fields.ts`: `usePostEventResponses` (linhas 77-92) e `exportPostEventResponsesCsv` (linhas 94-96), e o import de `PostEventResponse`/`keepPreviousData` se ficarem sem uso.

**Step 4: Verificar**

```bash
npm run build
```
Esperado: build limpo, sem erro de tipo/import não usado.

**Step 5: Commit**

```bash
git add lib/api/form-fields.ts lib/api/query-keys.ts
git commit -m "fix(form-fields): use backend ?kind= filter instead of client-side select"
```

---

### Task 2: `templates` — filtrar por evento no seletor de automação

**Files:**
- Modify: `lib/api/global-messaging.ts:16-25`
- Modify: `components/events/event-automation-dialog.tsx:51-52`
- Delete: `lib/api/templates.ts` (dead code, 0 callers)

**Step 1: Adicionar `eventId` opcional em `useAllTemplates`**

```ts
export function useAllTemplates(
  page = 1,
  limit = 20,
  channel?: MessageChannel,
  eventId?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.allTemplates({ page, limit, channel, eventId }),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (channel) qs.set("channel", channel);
      if (eventId) qs.set("eventId", eventId);
      return api.get<PaginatedResponse<TemplateWithEvent>>(`/templates?${qs.toString()}`);
    },
  });
}
```

**Step 2: Usar no diálogo de automação de evento**

Templates são do usuário (globais ou vinculados a um evento — ver `lib/api/templates.ts` `TemplateInput.eventId`). Hoje `event-automation-dialog.tsx` lista **todos** os templates de **todos** os eventos do usuário no seletor, o que confunde ao escolher template para automação de um evento específico. Com `?eventId=` funcionando, mostre só templates globais + os do evento atual. Backend filtra: confirme se `?eventId=` retorna só os vinculados a esse evento (globais entram sem esse filtro) — se sim, precisamos de **duas** chamadas (globais + do evento) ou pedir ao backend semântica de "globais + evento". Caso o backend só devolva os vinculados ao eventId (sem incluir globais), combine client-side:

```ts
const { data: eventTemplatesResponse } = useAllTemplates(1, 100, undefined, eventId);
const { data: globalTemplatesResponse } = useAllTemplates(1, 100, undefined, null);
const templates = [
  ...(globalTemplatesResponse?.data ?? []),
  ...(eventTemplatesResponse?.data ?? []).filter((t) => t.eventId === eventId),
];
```

Antes de implementar, valide rapidamente contra o backend (curl ou teste manual) o que `?eventId=<id>` retorna quando não há `channel` — se já vier globais+evento combinados, simplifique para uma única chamada `useAllTemplates(1, 100, undefined, eventId)`.

**Step 3: Remover dead code**

```bash
git rm lib/api/templates.ts
```
Confirme com `grep -rn "from \"@/lib/api/templates\"" --include="*.tsx" --include="*.ts" .` que só sobra o import de `TemplateInput` (esse tipo deve ser movido para `lib/api/global-messaging.ts` ou `lib/api/types.ts` antes de deletar o arquivo, já que `global-messaging.ts:13` importa `TemplateInput` de lá).

**Step 4: Verificar**

```bash
npm run build
npm run test
```

**Step 5: Commit**

```bash
git add lib/api/global-messaging.ts components/events/event-automation-dialog.tsx lib/api/templates.ts lib/api/types.ts
git commit -m "feat(automations): scope template picker by event using ?eventId= filter"
```

---

### Task 3: adicionar trigger `after_approval` ao enum do frontend

**Files:**
- Modify: `lib/api/types.ts:23-30`
- Modify: `lib/api/automations.ts:10-20`

**Step 1: Type**

```ts
export type AutomationTrigger =
  | "on_registration"
  | "on_post_event"
  | "on_nps"
  | "on_approval"
  | "on_rejection"
  | "after_approval"
  | "before_event"
  | "after_event";
```

**Step 2: Labels e delay**

```ts
export const DELAYED_TRIGGERS: AutomationTrigger[] = ["after_approval", "before_event", "after_event"];

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_registration: "Ao se inscrever - Formulário Principal",
  on_post_event: "Ao se inscrever - Pós-evento",
  on_nps: "Ao se inscrever - NPS",
  on_approval: "Ao ser aprovado",
  on_rejection: "Ao ser rejeitado",
  after_approval: "Depois de aprovado (com atraso)",
  before_event: "Antes do evento",
  after_event: "Depois do evento",
};
```

`after_approval` entra em `DELAYED_TRIGGERS` porque o worker (`scheduled-automations.worker.ts:52-54,117`) o processa com `delayMinutes`, igual `before_event`/`after_event`.

**Step 3: Verificar**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/automations.ts
git commit -m "feat(automations): add after_approval trigger to frontend enum"
```

---

### Task 4: validar `delayMinutes` máx. no diálogo de automação

**Files:**
- Modify: `components/events/event-automation-dialog.tsx:69-86,131-141`

**Step 1: Constante e validação em `handleSave`**

No topo do arquivo, adicione `const MAX_DELAY_MINUTES = 2147483647;` e em `handleSave`, antes de montar `input`:

```ts
function handleSave() {
  if (!templateId) return toast.error("Selecione o template");
  if (supportsDelay && delayMinutes && Number(delayMinutes) > MAX_DELAY_MINUTES) {
    return toast.error(`Atraso máximo é ${MAX_DELAY_MINUTES} minutos`);
  }
  const input = {
    ...
```

**Step 2: Atributo `max` no input**

```tsx
<Input
  id="eauto-delay"
  type="number"
  min={0}
  max={MAX_DELAY_MINUTES}
  value={delayMinutes}
  onChange={(e) => setDelayMinutes(e.target.value)}
/>
```

**Step 3: Verificar**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/events/event-automation-dialog.tsx
git commit -m "fix(automations): validate delayMinutes max client-side before submit"
```

---

### Task 5: travar edição de form-fields em evento `ended` (igual `cancelled`)

**Files:**
- Modify: `app/(dashboard)/events/[id]/form/page.tsx`

Hoje `FormBuilderSection`/`FormBuilderPage` não checam `event.status` — o form fica editável mesmo em evento cancelado/encerrado, embora o backend agora bloqueie (`PATCH .../form-fields` 403 nesses casos). Replicar o padrão de `app/(dashboard)/events/[id]/edit/page.tsx:65-68,98-103`.

**Step 1: Calcular `readonly` e propagar**

Em `FormBuilderPage` (linha ~348), depois de `const { data: event } = useEvent(eventId);`:

```ts
const readonly = event?.status === "cancelled" || event?.status === "ended";
```

Passe para `FormBuilderSection`:

```tsx
<FormBuilderSection eventId={eventId} kind={kind} slug={event?.slug} readonly={readonly} />
```

**Step 2: Desabilitar ações em `FormBuilderSection`**

Adicione `readonly` à assinatura (`{ eventId, kind, slug, readonly }: { ...; readonly: boolean }`). Desabilite:
- Botão "Novo campo": `disabled={readonly}`
- `onEdit`/`onDelete` em `SortableFieldRow`: passe `onEdit={readonly ? undefined : () => {...}}` ou adicione prop `disabled={readonly}` no botão de editar e no `AlertDialogTrigger` do botão excluir.
- `handleDragEnd`: `if (readonly || !over || active.id === over.id) return;`
- `DndContext`: pode manter, já que `handleDragEnd` sai no início.

Adicione também um aviso visual (mesmo texto/estilo do `edit/page.tsx:98-103`) no topo de `FormBuilderSection` quando `readonly`.

**Step 3: Verificar manualmente**

```bash
npm run dev
```
Abra um evento com status `ended` em `/events/[id]/form` e confirme que os controles ficam desabilitados.

**Step 4: Commit**

```bash
git add "app/(dashboard)/events/[id]/form/page.tsx"
git commit -m "fix(form-builder): lock field editing when event is ended, matching cancelled"
```

---

### Task 6: exigir `subject` quando `channel === "email"` no template

**Files:**
- Modify: `components/messages/global-template-dialog.tsx:142-155,246-254`

**Step 1: Validação em `handleSave`**

```ts
function handleSave() {
  if (!name.trim() || !body.trim()) {
    toast.error("Nome e corpo da mensagem são obrigatórios");
    return;
  }
  if (channel === "email" && !subject.trim()) {
    toast.error("Assunto é obrigatório para templates de e-mail");
    return;
  }
  ...
```

**Step 2: Indicar obrigatoriedade no label**

```tsx
<Label htmlFor="gtpl-subject">Assunto *</Label>
```

**Step 3: Verificar**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/messages/global-template-dialog.tsx
git commit -m "fix(templates): require subject when channel is email"
```

---

### Task 7: validar opções de select/multiselect contra `field.options` no formulário público

**Files:**
- Modify: `app/(public)/e/[slug]/registration-form.tsx:1-61`

Hoje o zod só checa "não vazio"/"pelo menos 1 item", sem cruzar com as opções configuradas — o backend agora rejeita valor fora da lista (400). Adiciona a mesma checagem no client para dar erro inline em vez de round-trip.

**Step 1: Importar helper existente**

```ts
import { fieldOptions } from "@/lib/forms/field-types";
```

**Step 2: Ajustar `buildSchema`**

Para `case "multiselect"`:

```ts
case "multiselect": {
  const opts = fieldOptions(field);
  const base = z.array(z.string()).refine(
    (vals) => vals.every((v) => opts.includes(v)),
    "Opção inválida",
  );
  schema = field.required ? base.refine((vals) => vals.length > 0, "Selecione ao menos uma opção") : base;
  break;
}
```

Para o `default` (cobre `select`, já que não tem `case` próprio hoje — adicione um):

```ts
case "select": {
  const opts = fieldOptions(field);
  schema = field.required
    ? z.string().min(1, "Campo obrigatório").refine((v) => opts.includes(v), "Opção inválida")
    : z.string().refine((v) => !v || opts.includes(v), "Opção inválida");
  break;
}
```

Mantenha o `default` genérico como está para os demais tipos (`text`, `textarea`, etc).

**Step 3: Verificar**

```bash
npm run test
npx tsc --noEmit
```

Teste manual: em `/e/[slug]`, tente (via devtools, alterando o DOM ou um teste) submeter um valor de select fora das opções — deve falhar client-side com "Opção inválida" antes de chegar no backend.

**Step 4: Commit**

```bash
git add "app/(public)/e/[slug]/registration-form.tsx"
git commit -m "fix(public-registration): validate select/multiselect against configured options"
```

---

### Task 8: tratar 404 de "inscrição não encontrada" no NPS/pós-evento

**Files:**
- Modify: `lib/api/public.ts:59-112`

Backend agora retorna 404 quando `identifier` não bate com nenhuma inscrição (antes aceitava qualquer coisa silenciosamente). Hoje o código só repassa `body.message` genérico — deixe explícito para os dois casos.

**Step 1: `submitPublicPostEvent`**

```ts
export async function submitPublicPostEvent(
  slug: string,
  payload: { identifier: string; answers: Record<string, unknown> },
): Promise<void> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/post-event/responses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Não encontramos uma inscrição com esse e-mail ou telefone. Verifique os dados e tente novamente.",
      );
    }
    let message = "Falha ao enviar respostas";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
      }
    } catch {}
    throw new Error(message);
  }
}
```

**Step 2: mesma coisa em `submitPublicNps`** (mensagem "Não encontramos uma inscrição..." + mesmo `if (res.status === 404)` antes do parse genérico).

**Step 3: Verificar**

```bash
npx tsc --noEmit
npm run test
```

**Step 4: Commit**

```bash
git add lib/api/public.ts
git commit -m "fix(public): show clear message on 404 when NPS/post-event identifier not found"
```

---

### Task 9: `maxLength` no nome do perfil

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx:181-184`

**Step 1:**

```tsx
<div className="space-y-2">
  <Label htmlFor="name">Nome</Label>
  <Input id="name" maxLength={120} {...form.register("name")} />
</div>
```

**Step 2: Verificar**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add "app/(dashboard)/settings/page.tsx"
git commit -m "fix(settings): cap name field at 120 chars to match backend limit"
```

---

## Fora de escopo (confirmado, sem ação)

- `registrations`/`post-event-responses`/`user-subscriptions` — filtros `status`/`search`/`format=csv` já corretos no frontend; bug era 100% backend.
- `POST /profile` (200 vs 201) — resposta é ignorada pelo frontend, nenhuma diferença de comportamento.
- `PATCH /profile/me` `evolutionInstance` vazio — já convertido para `undefined` e omitido do payload.
- `PATCH .../registrations/:id` merge — payload atual (snapshot completo) continua seguro com o novo merge do backend; simplificar para enviar só campos alterados é opcional (YAGNI, não é bug).
- WhatsApp groups 500→502 — mesma branch de erro genérica no frontend já cobre; sem mudança necessária.
- CSV formula-injection prefix, mensagens de enum mais descritivas — mudança é transparente/cosmética no backend, nada a fazer no frontend.
