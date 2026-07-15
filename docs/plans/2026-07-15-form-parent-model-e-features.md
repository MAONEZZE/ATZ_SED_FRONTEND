# Plano — Ajustes frontend p/ backend "Model Form pai" + novas features

## Context

O backend do SED sofreu a refatoração **"Model Form pai" (2026-07-15)** que quebra contrato de API, e o
usuário pediu um conjunto de novas features no frontend. Este plano cobre os dois: (a) adaptar o frontend aos
breaking changes que **quebram** create/update de evento e o modelo de FormField, e (b) implementar 8 features
novas (automação recorrente, import CSV de inscritos, modal de import reutilizável, normalização de telefone,
pipedrive no pós-evento, remoção do telefone fixo, edição de tipo de campo, mover descrição/mensagem p/ os forms).

Trabalho todo na **branch atual** (`feature/ajustes_task_868kbqbp7`). Sem branch/worktree novo. Repo é
**frontend-only**; backend já foi ajustado pelo usuário. Escopo confirmado: os itens 11/12/13 do contrato + forms
+ import + recurring. Itens 1-10 já foram adaptados em ciclo anterior (verificado em `public.ts` e `events.ts`).

Contrato de referência: `ATZ_SED_BACKEND/API_CONTRACTS.md` (§2 Events, §3 Form Fields, §3b Forms, §4 Registrations,
§6 Automations, §9 Público) + vault `~/Documents/SED/ATZ_SED_BACKEND/`.

Decisões do usuário: NPS é **anônimo** (sem identifier); pós-evento vem com campo **Telefone** default
visível/removível (frontend cria sob demanda); timezone **America/Sao_Paulo** fixo; descrição+mensagem editadas
**por kind** (3 abas do builder).

---

## Parte A — Breaking changes obrigatórios (senão quebra)

### A1. Types (`lib/api/types.ts`)
- `EventObject`: **remover** `description` (l.43) e `postRegistrationMessage` (l.54). Manter `sendToPipedrive`,
  `recurrenceFreq/Interval/Until` (continuam no Event — confirmado em `Modelo de Dados.md:44`).
- `FormField`: `eventId` → **`formId`** (breaking #12). Avaliar `kind` (backend não retorna mais direto; manter
  opcional só se algum consumidor usar — checar usos, provavelmente remover).
- `PublicEvent`: **manter** `description`/`postRegistrationMessage` (GET `/public/events/:slug` ainda expõe,
  mergeado do Form de `kind=registration`).
- `AutomationTrigger`: **adicionar** `"recurring"`.
- `Automation`: adicionar `cron: string | null` e `timezone: string | null`.
- **Novo** `Form`: `{ id, eventId, kind, description: string|null, postRegistrationMessage: string|null, createdAt, updatedAt }`.

### A2. Event create/update (`lib/api/events.ts` + `lib/validation/event-schema.ts`)
- `EventInput`: **remover** `description` e `postRegistrationMessage` (backend 400 via `forbidNonWhitelisted`).
  Manter recurrence + `sendToPipedrive`.
- `event-schema.ts`: remover `description` (l.6) e `postRegistrationMessage` (l.24) do schema e do `toEventInput`
  (l.45, l.62). Manter recurrence.

### A3. Remover descrição/mensagem da UI de evento
- `components/events/event-form-fields.tsx`: remover o `<Textarea description>` (l.55-63).
- `app/(dashboard)/events/[id]/edit/page.tsx`: remover bloco `postRegistrationMessage` (l.107-121) e refs em
  `toFormValues` (l.33, l.46). `new/page.tsx` herda de `EventFormFields`, sem ação extra.

---

## Parte B — Features novas

### B1. Editar tipo de campo (bug fix) — `type` agora aceito no PATCH (#13)
- `components/form-builder/field-editor-dialog.tsx`:
  - Remover o guard `{!field && (...)}` (l.155) → renderizar o `Select` de Tipo **também na edição**.
  - Incluir `type` no payload de update (l.126-129): `{ label, type, required, options }`.
- `lib/api/form-fields.ts`: `FormFieldUpdateInput` (l.17) — parar de fazer `Omit<..., "type">`; permitir `type`.

### B2. Descrição + mensagem por formulário (mover de Detalhes → builder, por kind)
- **Novo** `lib/api/forms.ts`: `useForm(eventId, kind)` → GET `/events/:eventId/forms/:kind`;
  `useUpdateForm(eventId, kind)` → PATCH mesma rota (`{description?, postRegistrationMessage?}`). Invalidar a query.
- `lib/api/query-keys.ts`: adicionar `form(eventId, kind)`.
- `app/(dashboard)/events/[id]/form/page.tsx` (`FormBuilderSection`): adicionar no topo um Card com editor de
  **Descrição** + **Mensagem pós-inscrição** vinculado ao `useForm/useUpdateForm(eventId, kind)`. Um por aba.
  - Nota (não-bloqueante): publicamente só o Form de `registration` expõe esses campos (via `/public/events/:slug`);
    editar em post_event/nps salva mas ainda não tem endpoint público de exibição.

### B3. Pipedrive toggle no pós-evento — `form/page.tsx`
- Linha 358: trocar `{isRegistration && <PipedriveToggle/>}` por `{(isRegistration || kind === "post_event") && ...}`.
- Reusa `event.sendToPipedrive` (mesma flag; sem mudança de tipo/backend). `PipedriveToggle` já existe (l.173-207).

### B4. Automação recorrente — `event-automation-dialog.tsx` + `lib/api/automations.ts`
- `automations.ts`: `AutomationInput` adicionar `cron?: string; timezone?: string;`. `TRIGGER_LABELS` adicionar
  `recurring: "Recorrente (data/hora fixa)"`.
- **Novo** `lib/utils/automation-cron.ts`: `buildCron({freq, time, dayOfWeek?, dayOfMonth?})` → string de 5 campos;
  `parseCron(cron)` → estado (p/ edição). Regras:
  - Diário: `m H * * *`; Semanal: `m H * * <0-6>`; Mensal: `m H <1-31> * *` (H/m vindos de `time` `HH:mm`).
- `event-automation-dialog.tsx`: quando `trigger === "recurring"`, mostrar bloco (padrão do `supportsDelay`):
  Frequência (Diário/Semanal/Mensal) + hora (`<input type="time">`) + dia-da-semana (só semanal) + dia-do-mês (só
  mensal). No `handleSave`, montar `cron` e enviar `timezone: "America/Sao_Paulo"`. Reusar `FREQ_OPTIONS`-style de
  `event-form-fields.tsx`. Múltiplas regras recurring ativas são permitidas (sem checagem de duplicata).
- Mutations em `lib/api/global-messaging.ts` já passam o input direto — sem mudança.

### B5. Normalização de telefone (CSV do envio manual) — task 4
- **Novo** `lib/utils/normalize-phone.ts`: `normalizeBrPhone(raw)`: `digits = raw.replace(/\D/g,"")`; se
  `digits` começa com `"55"` → mantém; senão → `"55" + digits`. Retorna só dígitos (sem `+`).
- Aplicar em `lib/utils/parse-recipients-csv.ts` (no `phone`, l.72/81) — cobre o envio manual via CSV.

### B6. Modal de import CSV reutilizável (instruções + dropzone) — task "onde houver import"
- **Novo** `components/common/csv-import-modal.tsx`: `Dialog` com texto explicativo (planilha deve ter colunas
  **Nome, Telefone, Email**; 1 registro por linha; salvar como CSV) + dropzone (`onDragOver`/`onDrop` nativos +
  `<input type="file" hidden>` clicável). Props: `open, onOpenChange, onFile(file), title?, description?`.
  Sem lib nova (usa `components/ui/dialog.tsx`).
- Ligar em `components/messages/send-message-form.tsx`: botão "Importar CSV" (l.482-491) passa a abrir o modal em
  vez de `csvInputRef.current?.click()` direto; `onFile` → `importCsv` (l.241-261) existente.

### B7. Import de inscritos via CSV — task 3
- `lib/api/registrations.ts`: **novo** `useImportRegistrations(eventId)` → POST
  `/events/:eventId/registrations/import` body `{ registrations: [{ nome, telefone?, email? }] }` → `{created, skipped}`.
  Invalidar registrations. (Backend normaliza telefone + dedup server-side.)
- `app/(dashboard)/events/[id]/attendees/page.tsx`: adicionar botão "Importar CSV" ao lado do "Exportar CSV"
  (l.146-153) → abre `CsvImportModal` → parseia (reusa `parseRecipientsCsv`) → mapeia p/ `{nome,telefone,email}`
  → chama mutation → toast `X criados, Y ignorados` → invalida lista.

### B8. Remover telefone fixo dos públicos + Telefone default no pós-evento — task 6
- **Pós-evento** (`app/(public)/e/[slug]/pos-evento/page.tsx`): remover o input fixo `identifier` (l.114-125) e o
  estado/validação (l.23, l.42-46). Derivar `identifier` da resposta do campo **Telefone** (ou Email) do próprio
  form: no `onSubmit`, achar o field `type==="phone"|"email"` e usar seu valor como `identifier` no
  `submitPublicPostEvent`. (Assinatura de `submitPublicPostEvent` mantida.)
- **Seed do Telefone default** (frontend, sob demanda): em `form/page.tsx` `FormBuilderSection`, quando
  `kind === "post_event"` e `fields` carregou vazio (`length === 0`), criar 1 field via `useCreateFormField`
  (`{label:"Telefone", type:"phone", kind:"post_event", required:true, order:0}`). Guard p/ rodar 1x por load.
  Fica removível/editável no builder normalmente.
- **NPS anônimo** (`app/(public)/e/[slug]/nps/page.tsx`): remover input `identifier` (l.114-125) + estado/validação.
  Enviar só `{ answers }` (sem identifier). `lib/api/public.ts` `submitPublicNps` (l.99-124): remover `identifier`
  do payload. **Verificar** que `POST /public/events/:slug/nps/responses` aceita sem identifier; se 400 → pendência
  de backend (anonimizar nps submit).

### B9. Foto de capa em cada página de formulário — task nova
- Hoje só a inscrição (`app/(public)/e/[slug]/page.tsx`, hero de capa l.118-137) mostra o `coverUrl`. Pós-evento e
  NPS são client pages que só buscam fields.
- Nas duas páginas (`pos-evento/page.tsx`, `nps/page.tsx`): buscar o evento público via `getPublicEvent(slug)`
  (`lib/api/public.ts`) e renderizar o mesmo hero de capa acima do Card (reusar markup l.125-137: `<Image fill
  object-cover>` + gradiente). Fallback quando sem `coverUrl` (sem hero, layout atual).
- Considerar extrair o hero num componente compartilhado (ex. `components/forms/event-cover-hero.tsx`) e usar nas 3
  páginas, evitando duplicar o bloco.

---

## Arquivos-chave

| Área | Arquivos |
|---|---|
| Types/API | `lib/api/types.ts`, `lib/api/events.ts`, `lib/api/automations.ts`, `lib/api/registrations.ts`, `lib/api/query-keys.ts`, **novo** `lib/api/forms.ts`, `lib/api/public.ts` |
| Validação | `lib/validation/event-schema.ts` |
| Utils (novos) | `lib/utils/normalize-phone.ts`, `lib/utils/automation-cron.ts` |
| Componentes | `components/form-builder/field-editor-dialog.tsx`, `components/events/event-automation-dialog.tsx`, `components/events/event-form-fields.tsx`, `components/messages/send-message-form.tsx`, **novo** `components/common/csv-import-modal.tsx` |
| Páginas | `app/(dashboard)/events/[id]/form/page.tsx`, `app/(dashboard)/events/[id]/edit/page.tsx`, `app/(dashboard)/events/[id]/attendees/page.tsx`, `app/(public)/e/[slug]/pos-evento/page.tsx`, `app/(public)/e/[slug]/nps/page.tsx` |
| Reuso | `parseRecipientsCsv`, `PipedriveToggle`, `DateTimePicker`, `Dialog`, `Switch`, `useCreateFormField` |

---

## Verificação

1. **Build/lint/types**: `npm run lint` + `npx tsc --noEmit` (strict) verdes. `npm run build`.
2. **Unit**: `npm test` (Vitest) — adicionar testes p/ `normalizeBrPhone` (casos: `"11999998888"` → `5511999998888`;
   `"5511..."` → mantém; `"+55 11 99999-8888"` → `5511999998888`; lixo não-numérico) e `buildCron/parseCron`
   (round-trip diário/semanal/mensal).
3. **E2E manual** (`npm run dev -- -p 3001`, backend em 3000, origem em `ALLOWED_ORIGINS`):
   - Criar/editar evento → confirma que não dá 400 (description/message removidos do payload).
   - Builder: editar o **tipo** de um campo existente → persiste. Editar descrição/mensagem por aba → salva.
   - Aba Pós-evento: aparece Telefone default + toggle Pipedrive; remover Telefone e recarregar (comportamento seed).
   - Automação: criar tipo **Recorrente** semanal seg 09:00 → confere cron `0 9 * * 1` no POST; editar reidrata.
   - Attendees: importar CSV → toast created/skipped; inscritos aparecem no funil.
   - Envio manual: importar CSV pelo modal → telefones normalizados (`55...`).
   - Público pós-evento: sem input identifier, submete e casa via resposta Telefone. NPS: submete anônimo.
4. Usar MCP/browser p/ dirigir os fluxos públicos e o builder (screenshots dos estados-chave).
