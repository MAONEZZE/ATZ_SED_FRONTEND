# Design — Autorização de uso de imagem por evento

Data: 2026-07-21

## Contexto

Backend adicionou feature: organizador pode exigir que quem se inscreve num evento aceite um
termo de uso de imagem. Configuração é **por evento** (no formulário de inscrição daquele evento,
`kind = registration`), não global.

Contrato backend:
- `GET/PATCH /events/:eventId/forms/registration` — novo campo `requireImageAuthorization`
  (boolean, default `false`). Só tem efeito quando `kind = registration`.
- `GET /public/events/:slug` — response inclui `requireImageAuthorization` (boolean).
- `POST /public/events/:slug/registrations` — body aceita `image_authorization` (boolean, opcional).
  - evento `requireImageAuthorization=true` + `image_authorization` ausente/false → **400**
    "Autorização de uso de imagem é obrigatória".
  - `image_authorization=true` → aceita.
  - evento `requireImageAuthorization=false` → campo opcional.
  - Response 201 inclui `imageAuthorization` (boolean) persistido.

## Decisões de UX

- **Consent visitante:** checkbox obrigatório + link para o PDF do termo
  (`/autorizacao-imagem.pdf`, abre em nova aba). PDF já existe no repo.
- **Toggle organizador:** `Switch` "Exigir autorização de uso de imagem" **dentro do card
  existente** do `FormMetaEditor` (abaixo dos campos atuais), não em aba nova.
- **Consent no form público:** campo único gerenciado pelo react-hook-form via schema estendido
  (fonte única, erro tratado pelo form). Descartado: `useState` separado + validação manual.

## Mudanças por arquivo

### Tipos
- `lib/api/types.ts`
  - `interface Form` (~L69): `+ requireImageAuthorization: boolean`
  - `interface PublicEvent` (~L199): `+ requireImageAuthorization: boolean`
- `lib/api/forms.ts`
  - `FormUpdateInput` (~L8): `+ requireImageAuthorization?: boolean`

### Painel organizador
- `app/(dashboard)/events/[id]/form/page.tsx` — `FormMetaEditor` (L213–347):
  - `useState` `requireImageAuthorization`
  - seed no `useEffect` de meta (L232–236)
  - incluir na dirty check (L238–241)
  - incluir no `update.mutate({...})` (L256–271)
  - `Switch` + label dentro do `CardContent` existente (~L280–333)

### Página pública
- `app/(public)/e/[slug]/page.tsx` (L163–168): passar
  `requireImageAuthorization={event.requireImageAuthorization}` ao `<RegistrationForm>`.
- `app/(public)/e/[slug]/registration-form.tsx`:
  - nova prop `requireImageAuthorization: boolean`
  - checkbox obrigatório após `FormFieldsRenderer` (L108), antes do submit (L111)
  - texto "Aceito o termo de uso de imagem" + link `/autorizacao-imagem.pdf` (`target="_blank"`,
    `rel="noopener noreferrer"`)
  - campo registrado como `image_authorization` (entra natural no `values` → body do POST)

### Validação + submit
- `lib/validation/registration-form-schema.ts`:
  - `buildSchema(fields, requireImageAuthorization)` e `defaultValues(fields, requireImageAuthorization)`
    recebem a flag
  - quando `true`, append campo `image_authorization`:
    `z.boolean().refine((v) => v, "Autorização de uso de imagem é obrigatória")`
    (reusa padrão checkbox L50–54); default `false` (L82)
- `lib/api/public.ts`: `createPublicRegistration` já serializa `values` como body (L33) — sem
  mudança de assinatura. 400 já tratado (L36–45, `toast.error`).

## Testes

- Unit (`unit_test/`) para `buildSchema` / `defaultValues` com flag on/off:
  - flag off → sem campo `image_authorization`
  - flag on → campo presente, `false` reprovado, `true` aprovado, default `false`

## YAGNI

- Sem termo inline/expansível — só link PDF.
- Sem config global de conta — só por evento (kind=registration).
- Sem exibir `imageAuthorization` da response 201 na UI pública (nada pede).
