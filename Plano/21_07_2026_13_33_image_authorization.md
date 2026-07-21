# Autorização de uso de imagem por evento

**Criado:** 21/07/2026 13:33
**Objetivo:** Permitir que o organizador exija consentimento de uso de imagem no formulário de inscrição de um evento, e que o visitante aceite via checkbox obrigatório (com link para o termo PDF) no form público.

## Contexto

Feature nova do backend (contrato já pronto):
- `GET/PATCH /events/:eventId/forms/registration` — novo campo `requireImageAuthorization` (boolean, default `false`; só efeito em `kind=registration`).
- `GET /public/events/:slug` — response inclui `requireImageAuthorization`.
- `POST /public/events/:slug/registrations` — body aceita `image_authorization` (boolean, opcional, estilo `send_to_pipedrive`). Flag on + ausente/false → 400 "Autorização de uso de imagem é obrigatória". Response 201 inclui `imageAuthorization`.

Arquivos afetados (verificados no código):
- `lib/api/types.ts` — `interface Form` (~L69), `interface PublicEvent` (~L199)
- `lib/api/forms.ts:8-12` — `FormUpdateInput`
- `lib/validation/registration-form-schema.ts` — `buildSchema`/`defaultValues` (keyed por label; consent = chave literal `image_authorization`; padrão checkbox obrigatório `z.boolean().refine((v)=>v,"...")` já existe L50–54)
- `app/(public)/e/[slug]/registration-form.tsx` — checkbox após `FormFieldsRenderer` (L108), antes do submit (L111)
- `app/(public)/e/[slug]/page.tsx:163-168` — passar prop ao `<RegistrationForm>`
- `app/(dashboard)/events/[id]/form/page.tsx` — `FormMetaEditor` (L213–347); `Switch`+`Label` já importados via `PipedriveToggle`
- `tests/unit_test/validation/registration-form-schema.spec.ts` — testes do schema

Decisões (aprovadas no brainstorming):
- UX consent: checkbox obrigatório + link `/autorizacao-imagem.pdf` (PDF já no repo, `target=_blank`).
- Toggle organizador: `Switch` **dentro do card existente** do `FormMetaEditor`, só quando `kind === "registration"`.
- Consent = campo único no react-hook-form via schema estendido (não `useState` separado).
- `createPublicRegistration` sem mudança de assinatura — `image_authorization` entra natural no body. 400 já tratado por toast.

Fora de escopo (YAGNI): termo inline/expansível; config global de conta; exibir `imageAuthorization` da 201 na UI; novo teste e2e.

Plano técnico detalhado (com código completo por passo): `docs/plans/2026-07-21-image-authorization.md`.

## Tarefas

- [x] 1. Tipos + payload: `requireImageAuthorization` em `Form` e `PublicEvent` (`lib/api/types.ts`), campo opcional em `FormUpdateInput` (`lib/api/forms.ts`) — _done quando:_ `npx tsc --noEmit` sem novos erros.
- [x] 2. Schema de consentimento (TDD): estender `buildSchema`/`defaultValues` com flag `requireImageAuthorization`, campo `image_authorization` obrigatório quando on; testes novos em `registration-form-schema.spec.ts` — _done quando:_ `npx vitest run tests/unit_test/validation/registration-form-schema.spec.ts` verde (novos + antigos).
- [x] 3. Checkbox de consentimento no form público: nova prop `requireImageAuthorization` em `RegistrationForm`, wiring no `buildSchema`/`defaultValues`, `Controller` + `Checkbox` + link do termo após `FormFieldsRenderer` — _done quando:_ `npx tsc --noEmit` sem novos erros e checkbox renderiza quando flag on.
- [x] 4. Página pública passa a flag: `requireImageAuthorization={event.requireImageAuthorization}` no `<RegistrationForm>` (`page.tsx` L163–168) — _done quando:_ `npx tsc --noEmit` sem novos erros.
- [x] 5. Toggle organizador: `Switch` "Exigir autorização de uso de imagem" no `FormMetaEditor` (estado + seed + dirty + `update.mutate`), só quando `kind === "registration"` — _done quando:_ `npx tsc --noEmit` sem novos erros; ao ligar/salvar, PATCH inclui `requireImageAuthorization`.
- [x] 6. Verificação final: suite completa + build — _done quando:_ `npm run test` verde, `npx tsc --noEmit` limpo, `npm run build` OK.

## Notas de progresso

### Tarefa 1 — Tipos + payload ✅ 21/07 13:34
- **Feito:** `requireImageAuthorization: boolean` em `Form` e `PublicEvent`; `requireImageAuthorization?: boolean` em `FormUpdateInput`.
- **Arquivos:** `lib/api/types.ts`, `lib/api/forms.ts`
- **Decisões:** nenhuma fora do plano.

### Tarefa 2 — Schema de consentimento (TDD) ✅ 21/07 13:38
- **Feito:** `buildSchema`/`defaultValues` recebem flag opcional `requireImageAuthorization`; campo `image_authorization` obrigatório (refine) quando on. 3 testes novos, 12/12 verde.
- **Arquivos:** `lib/validation/registration-form-schema.ts`, `tests/unit_test/validation/registration-form-schema.spec.ts`
- **Decisões:** confirmado fluxo red→green (teste falhou antes da implementação).

### Tarefa 3 — Checkbox consentimento no form público ✅ 21/07 13:41
- **Feito:** prop `requireImageAuthorization` em `RegistrationForm`; `Controller`+`Checkbox` renderiza campo `image_authorization` com link `/autorizacao-imagem.pdf` (nova aba) quando flag on; erro de validação exibido inline.
- **Arquivos:** `app/(public)/e/[slug]/registration-form.tsx`
- **Decisões:** nenhuma fora do plano.

### Tarefa 4 — Página pública passa a flag ✅ 21/07 13:42
- **Feito:** `requireImageAuthorization={event.requireImageAuthorization}` passado ao `<RegistrationForm>`.
- **Arquivos:** `app/(public)/e/[slug]/page.tsx`
- **Decisões:** nenhuma fora do plano.

### Tarefa 5 — Toggle organizador (Switch) ✅ 21/07 13:47
- **Feito:** estado `requireImageAuthorization` (seed + dirty + `update.mutate`); `Switch` "Exigir autorização de uso de imagem" renderizado só quando `kind === "registration"`.
- **Arquivos:** `app/(dashboard)/events/[id]/form/page.tsx`
- **Decisões:** reusou `Switch`/`Label` já importados (padrão `PipedriveToggle`).

### Tarefa 6 — Verificação final ✅ 21/07 13:52
- **Feito:** `npm run test` 16/16 arquivos, 109/109 testes verde; `npx tsc --noEmit` limpo; `npm run build` compilou e gerou 12/12 páginas estáticas.
- **Arquivos:** nenhum (só verificação).
- **Decisões:** warning `react-hooks/exhaustive-deps` em `registration-form.tsx:55` é pré-existente, não introduzido por esta feature — não corrigido (fora de escopo).
