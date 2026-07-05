# Contratos da API do backend (ATZ_SED_BACKEND)

Mapeado direto dos controllers/DTOs em `../ATZ_SED_BACKEND` (não do `API_CONTRACTS.md`,
que está parcialmente desatualizado). Gerado em 2026-07-03 via varredura dos 16 controllers.

## Convenções globais

- **Base URL:** `NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3001`). **Sem prefixo global** (`setGlobalPrefix` não é chamado) — paths são exatamente `@Controller` + método.
- **Auth:** Bearer JWT (`Authorization: Bearer <supabase_jwt>`) em tudo, EXCETO `public/*` e `health` (sem guard). `JwtAuthGuard` valida token; `OwnershipGuard` (rotas com `:eventId`/`:id` de evento) exige que o caller seja **dono OU colaborador** do evento (senão 403; 404 se evento inexistente).
- **Validação:** `ValidationPipe` global `{ whitelist:true, forbidNonWhitelisted:true, transform:true }`. **Campo extra no body → 400** (`property X should not exist`). Mande só o que o DTO declara.
- **Erro padrão:** `{ statusCode, message, requestId, timestamp }` (`message` pode ser array).
- **Paginação:** query `page?` (int ≥1, default 1), `limit?` (int 1–100, default 20). Envelope: `{ data: T[], total, page, limit }`.
- **CSV:** rotas de listagem de inscritos aceitam `?format=csv` → resposta `text/csv; charset=utf-8` + `Content-Disposition: attachment`. Sem `format`/`format=json` → JSON paginado.
- **Datas:** aceitas como ISO 8601 no body; devolvidas como ISO/Date.
- **CORS:** métodos `GET, POST, PATCH, DELETE`; headers `Content-Type, Authorization, x-request-id`.

## Enums (canônico, do Prisma)

| Enum | Valores |
|---|---|
| `EventStatus` | `draft` \| `published` \| `cancelled` \| `ended` |
| `FunnelStatus` | `pending` \| `approved` \| `rejected` |
| `FieldType` | `text` \| `textarea` \| `email` \| `phone` \| `select` \| `multiselect` \| `checkbox` \| `image` \| `date` |
| `FormFieldKind` | `registration` \| `post_event` \| `nps` |
| `MessageChannel` | `whatsapp` \| `email` |
| `AutomationTrigger` (Prisma, 8) | `on_registration` \| `on_post_event` \| `on_nps` \| `on_approval` \| `on_rejection` \| `before_event` \| `after_event` \| `after_approval` |
| `styleKey` (template) | `minimalista` \| `profissional` \| `acolhedor` \| `elegante` |
| `recurrence.freq` | `DAILY` \| `WEEKLY` \| `MONTHLY` \| `YEARLY` |

> ⚠️ **Discrepância crítica:** o DTO de automação (`CreateAutomationDto.@IsEnum`) aceita só **7** valores — **omite `after_approval`**. Prisma + worker de agendamento (`scheduled-automations.worker.ts`) suportam, mas POST/PATCH `/automations` **rejeitam** `after_approval` (400). Frontend NÃO deve oferecer `after_approval` até o backend adicionar ao `@IsEnum`. Ver seção "Pendências".

---

## EVENTS — `EventsController` (prefix `/events`)

| Método | Path | Status | Body | Notas |
|---|---|---|---|---|
| POST | `/events` | 201 | `CreateEventDto` | cria evento |
| GET | `/events` | 200 | — | paginado; **só eventos do dono** (colaborador não vê na lista) |
| GET | `/events/:id` | 200 | — | Ownership; 404 |
| PATCH | `/events/:id` | 200 | `UpdateEventDto` | 403 se `cancelled`; 400 se `endDate<=eventDate` |
| PATCH | `/events/:id/status` | 200 | `UpdateEventStatusDto` | cancelar = `{status:"cancelled", notifyParticipants?}` |
| POST | `/events/:id/cover` | 201 | multipart `file` | img jpeg/png/webp, **máx 5MB** |
| DELETE | `/events/:id/cover` | 200 | — | zera `coverUrl` |
| DELETE | `/events/:id` | 204 | — | |
| POST | `/events/:id/duplicate` | 201 | — | cópia em `draft`, novo slug |

**`CreateEventDto`:** `title` (str, req, min 3); opcionais: `description`, `location`, `capacity` (int≥1), `dressCode`, `groupLink`, `eventDate` (ISO), `endDate` (ISO), `postRegistrationMessage`, `sendToPipedrive` (bool), `recurrenceFreq` (`DAILY|WEEKLY|MONTHLY|YEARLY`), `recurrenceInterval` (int≥1), `recurrenceUntil` (ISO).
**`UpdateEventDto`** = PartialType(CreateEventDto) + `evolutionInstance?`, `evolutionToken?`.
**`UpdateEventStatusDto`:** `status` (req, EventStatus), `notifyParticipants?` (bool, só p/ `cancelled`).
**Transições válidas:** `draft→published|cancelled`; `published→cancelled|ended`; `cancelled/ended→∅`. Inválida → 400.
**`EventEntity`:** `id, ownerId, title, slug, status, description?, coverUrl?, location?, capacity?, dressCode?, groupLink?, eventDate?, endDate?, evolutionInstance?, evolutionToken?, postRegistrationMessage?, sendToPipedrive, recurrenceFreq?, recurrenceInterval?, recurrenceUntil?, lastEditedById?, createdAt?, updatedAt?`.

## EVENTS — `CollaboratorsController` (prefix `/events/:eventId/collaborators`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/events/:eventId/collaborators` | 200 | — |
| POST | `/events/:eventId/collaborators` | 201 | `AddCollaboratorDto {email}` |
| DELETE | `/events/:eventId/collaborators/:profileId` | 204 | — |

`AddCollaboratorDto`: `email` (req, `@IsEmail`; deve já ser usuário cadastrado). 404 se email não cadastrado; 409 se for o dono.
Item GET: `{ id, eventId, profileId, createdAt, profile:{ id, name, email, photoUrl } }`.

## EVENTS — `FormFieldsController` (prefix `/events/:eventId/form-fields`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/events/:eventId/form-fields` | 200 | — (query `kind?`, page/limit) |
| POST | `/events/:eventId/form-fields` | 201 | `CreateFormFieldDto` |
| PATCH | `/events/:eventId/form-fields/:id` | 200 | `UpdateFormFieldDto` (sem `type`) |
| DELETE | `/events/:eventId/form-fields/:id` | 204 | — |

`CreateFormFieldDto`: `label` (str, req), `type` (req, FieldType), `required?` (bool, default true), `options?` (JSON livre, ex.: `["A","B"]`), `order?` (int≥0, default 99), `kind?` (FormFieldKind, default `registration`).
`UpdateFormFieldDto` = PartialType(Omit(Create,'type')); serviço aplica só `label/required/options/order` (`kind` ignorado no update).
`FormField`: `{ id, eventId, label, type, required, options, order, isFixed, kind, createdAt }`.

---

## REGISTRATIONS — `RegistrationsController` (prefix `/events/:eventId/registrations`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/events/:eventId/registrations` | 200 | — (query `status?`, `search?`, `format?`, page/limit) |
| GET | `/events/:eventId/registrations/:id` | 200 | — |
| PATCH | `/events/:eventId/registrations/:id` | 200 | `UpdateRegistrationAnswersDto {answers}` |
| PATCH | `/events/:eventId/registrations/:id/status` | 200 | `UpdateRegistrationStatusDto {status}` |

`UpdateRegistrationAnswersDto`: `answers` (req, `@IsObject`). 400 se campo obrigatório vazio.
`UpdateRegistrationStatusDto`: `status` (req, FunnelStatus). 400 se transição inválida.
CSV: `inscricoes-<eventId>-<data>.csv` — colunas `nome, email, telefone, status, data_inscricao` + 1 coluna por label de campo.
`RegistrationEntity`: `{ id, eventId, status, answers, name, email, phone, createdAt, updatedAt }`.

## REGISTRATIONS — `PostEventResponsesController` (`/events/:eventId/post-event-responses`)

| Método | Path | Status |
|---|---|---|
| GET | `/events/:eventId/post-event-responses` | 200 (query `format?`, page/limit) |

Item: registro `postEventResponse` com `answers, createdAt, registration:{id,name,email,phone}`.
CSV: `respostas-pos-evento-<eventId>-<data>.csv`.

## REGISTRATIONS — `UserSubscriptionsController` (`/events/:eventId/user-subscriptions`)

| Método | Path | Status |
|---|---|---|
| GET | `/events/:eventId/user-subscriptions` | 200 (query `search?`, `format?`, page/limit) |

`UserSubscriptionRow`: `{ id, eventId, name?, email?, phone?, registrationAnswers?, postEventAnswers?, npsAnswers?, sendToPipedrive, pipedriveStatus (pending|sent|failed|skipped|null), createdAt, updatedAt }`.
CSV: `inscritos-<eventId>.csv` (sem data no nome) — colunas fixas + `Inscrição: <label>`, `Pós-evento: <label>`, `NPS: <label>`.

---

## MESSAGING — `MessagingController` (prefix `/events/:eventId/message-logs`)

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/events/:eventId/message-logs` | 200 | paginado, escopado ao evento |
| GET | `/events/:eventId/message-logs/stream` | 200 | **SSE** `text/event-stream`, poll 3s, últimos 20 |

`MessageLog`: `{ id, eventId?, ownerId?, registrationId?, channel, recipient, body, status, errorMessage?, sentAt?, createdAt }`.

## MESSAGING — `GlobalMessagingController` (sem prefix)

| Método | Path | Status | Body |
|---|---|---|---|
| POST | `/messages` | **202** | `SendMessageDto` |
| POST | `/messages/attachments` | 201 | multipart `file` (**25MB**) |
| POST | `/messaging/templates` | 201 | `CreateGlobalTemplateDto` |
| GET | `/templates` | 200 | — (query `eventId?` — `'null'`=globais; page/limit) |
| GET | `/templates/:id` | 200 | — |
| PATCH | `/templates/:id` | 200 | `UpdateGlobalTemplateDto` |
| DELETE | `/templates/:id` | 204 | — |
| GET | `/automations` | 200 | — (cross-event, inclui `event`+`template`) |
| GET | `/messaging/logs` | 200 | — (cross-event, inclui `event:{id,title}`) |

**`SendMessageDto`:** `channel` (req, `whatsapp|email`); opcionais: `eventId` (UUID), `templateId` (str), `subject` (str), `body` (str; suporta `{{name}}`,`{{event.title}}`), `registrationIds` (str[], só com `eventId`), `manualRecipients` (ManualRecipientDto[]), `invite` (InviteConfigDto), `attachments` (AttachmentRefDto[]).
- `ManualRecipientDto`: `name` (req), `email?` (`@IsEmail`), `phone?` (str).
- `AttachmentRefDto`: `path` (req, do passo upload), `filename` (req), `mimetype` (req). **Nada além disso** (mandar `size`/`contentBase64` → 400).
- `InviteConfigDto`: `date` (req, `YYYY-MM-DD`), `allDay?` (bool), `startTime?`/`endTime?` (`HH:mm`, req se `allDay=false`), `timezone` (req, IANA), `recurrence?` (InviteRecurrenceDto|null).
- `InviteRecurrenceDto`: `freq` (req), `interval` (req, int≥1), `until?` (ISO8601).
- Resposta 202: `{ queued, skipped, skippedReason: string[], batches }`.

**`POST /messages/attachments`** (fluxo 2 passos): multipart campo `file`, máx **25MB**, mime aceito (regex verbatim):
```
/(image\/(jpeg|png|webp|gif))|(application\/pdf)|(application\/msword)|(application\/vnd\.openxmlformats-officedocument\.[\w.-]+)|(application\/vnd\.ms-(excel|powerpoint))|(video\/mp4)|(audio\/(mpeg|ogg))/
```
Resposta 201: `{ path, filename, mimetype, size }`. Use `path` no `attachments[].path` do `/messages`.

**`CreateGlobalTemplateDto`:** `name` (req, min 1), `channel` (req, `whatsapp|email`), `body` (req, min 1); opcionais `subject`, `layoutConfig` (obj, email), `styleKey` (enum), `eventId` (UUID).
**`UpdateGlobalTemplateDto`:** todos opcionais; `eventId` aceita `null` p/ desvincular.
`MessageTemplate`: `{ id, ownerId, name, channel, subject?, body, layoutConfig?, styleKey?, eventId?, createdAt, updatedAt }`.

> `GET /messaging/logs` (global agregado) ≠ `GET /events/:eventId/message-logs` (escopado). Ambos válidos.

---

## USERS — `ProfileController` (prefix `/profile`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/profile/me` | 200 | — |
| PATCH | `/profile/me` | 200 | `UpdateProfileDto` |
| POST | `/profile` | 201 | — (upsert idempotente; identidade do token) |
| POST | `/profile/me/photo` | 201 | multipart `file` (img jpeg/png/webp, máx 5MB) |
| DELETE | `/profile/me/photo` | 200 | — |

`UpdateProfileDto`: `name?` (str, min 2), `evolutionInstance?` (str).
`Profile`: `{ id, userId, name, email, photoUrl?, evolutionInstance?, createdAt, updatedAt }`.

## USERS — `WhatsappController` (prefix `/whatsapp`)

| Método | Path | Status |
|---|---|---|
| GET | `/whatsapp/groups?instancia=<nome>` | 200 |

`instancia` obrigatório (400 se ausente). Resposta: `{ id, subject }[]`.

## AUTOMATIONS — `AutomationsController` (prefix `/events/:eventId/automations`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/events/:eventId/automations` | 200 | — (page/limit) |
| GET | `/events/:eventId/automations/:id` | 200 | — (template completo) |
| POST | `/events/:eventId/automations` | 201 | `CreateAutomationDto` |
| PATCH | `/events/:eventId/automations/:id` | 200 | `UpdateAutomationDto` |
| DELETE | `/events/:eventId/automations/:id` | 204 | — |

`CreateAutomationDto`: `templateId` (req, str), `trigger` (req, `@IsEnum` **7 valores — SEM `after_approval`**), `delayMinutes?` (int≥0; `0→null`=imediato), `active?` (bool, default true).
`UpdateAutomationDto` = PartialType(Create).
`AutomationRule`: `{ id, eventId, templateId, trigger, delayMinutes?, active, createdAt, template:{id,name,channel} }`.

## HEALTH — `HealthController` (prefix `/health`)

| Método | Path | Auth | Status |
|---|---|---|---|
| GET | `/health` | público | 200 `{ status, info, error, details }` |

---

## PUBLIC (sem auth; prefix `public/events`)

| Método | Path | Status | Body |
|---|---|---|---|
| GET | `/public/events/:slug` | 200 | — (só `published`/`ended`, senão 404) |
| GET | `/public/events/:slug/form-fields` | 200 | — (registration; some se `ended`) |
| GET | `/public/events/:slug/post-event/form-fields` | 200 | — (visível se `ended`) |
| GET | `/public/events/:slug/nps/form-fields` | 200 | — (visível se `ended`) |
| POST | `/public/events/:slug/registrations` | 201 | `Record<string,unknown>` (chaves dinâmicas) |
| POST | `/public/events/:slug/post-event/responses` | **200** | `SubmitPostEventDto` |
| POST | `/public/events/:slug/nps/responses` | **200** | `SubmitNpsDto` |

**Detalhe do POST registrations (#5):** SEM wrapper — corpo é o mapa de respostas no **top-level**, chaveado por **labels dos campos**. Chaves reconhecidas: `nome`/`name`, `email`, `telefone`/`phone` (populam contato); demais viram `answers`. Flag opcional `send_to_pipedrive` (bool, removida de `answers`). Requer evento `published` (senão 400). Retorna `RegistrationEntity`.
**post-event/NPS (#6/#7):** COM wrapper `{ identifier, answers:{ "<label>": valor } }`. `identifier` = email ou telefone (cross-match com inscrição). `@IsObject` em `answers` (chaves dinâmicas dentro dele; top-level extra → 400). Evento `published`/`ended`. Retorna `{ ok: true }`.
Form-fields públicos: `{ id, label, type, required, options, order }[]`.

---

## Pendências / decisões (frontend)

1. **`after_approval`**: NÃO adicionar no frontend enquanto o `CreateAutomationDto.@IsEnum` do backend não incluir o valor (rejeita com 400). Alinhar com time de backend primeiro. (Revisa a Mudança 1 do plano `escreva-um-plano-para-proud-thimble.md`.)
2. **Anexos**: espelhar limite 25MB + regex de mime no cliente (Mudança 2 do plano).
3. **Logs por evento + SSE** (`/events/:id/message-logs[/stream]`): sem consumidor no frontend hoje. Só implementar se for feature nova.
4. **`GET /messaging/logs`** (global) permanece válido — não renomear.
