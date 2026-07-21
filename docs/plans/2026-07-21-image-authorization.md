# Autorização de uso de imagem por evento — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir que o organizador exija consentimento de uso de imagem no formulário de inscrição de um evento, e que o visitante aceite via checkbox obrigatório no form público.

**Architecture:** Campo de config `requireImageAuthorization` no `Form` (kind=registration), editável por um `Switch` no painel. A página pública lê a flag do `PublicEvent` e renderiza um checkbox obrigatório (`image_authorization`) gerenciado pelo react-hook-form via schema estendido. O valor entra natural no body do POST (controle snake_case, estilo `send_to_pipedrive`). 400 do backend já é tratado por toast.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict, react-hook-form + zod, TanStack Query, shadcn/ui, Vitest.

---

## Notas de contexto (verificadas no código)

- `buildSchema` e `defaultValues` moram em `lib/validation/registration-form-schema.ts` e são keyed por `answerKeyForField(field)` (= label). O campo de consentimento será uma chave literal `image_authorization`.
- Padrão de checkbox obrigatório já existe: `z.boolean().refine((v) => v, "...")` (schema L50–54).
- `createPublicRegistration` (`lib/api/public.ts` L24–47) serializa `answers` como body — sem mudança de assinatura. 400 lido de `body.message` (L36–45).
- `FormMetaEditor` (`app/(dashboard)/events/[id]/form/page.tsx` L213–347) usa `useState`, não zod. É reutilizado para todos os `kind` — o Switch só deve aparecer quando `kind === "registration"`.
- PDF do termo já existe: `public/autorizacao-imagem.pdf` → servido em `/autorizacao-imagem.pdf`.

---

## Task 1: Tipos + payload

**Files:**
- Modify: `lib/api/types.ts` (`interface Form` ~L69; `interface PublicEvent` ~L199)
- Modify: `lib/api/forms.ts:8-12` (`FormUpdateInput`)

**Step 1: Adicionar campo ao `interface Form`**

Em `lib/api/types.ts`, dentro de `interface Form`, adicionar:

```ts
requireImageAuthorization: boolean;
```

**Step 2: Adicionar campo ao `interface PublicEvent`**

Em `lib/api/types.ts`, dentro de `interface PublicEvent`, adicionar:

```ts
requireImageAuthorization: boolean;
```

**Step 3: Adicionar ao `FormUpdateInput`**

Em `lib/api/forms.ts`:

```ts
export interface FormUpdateInput {
  description?: string | null;
  postRegistrationMessage?: string | null;
  linkPostSubscription?: string | null;
  requireImageAuthorization?: boolean;
}
```

**Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

**Step 5: Commit**

```bash
git add lib/api/types.ts lib/api/forms.ts
git commit -m "feat: add requireImageAuthorization to form and public-event types"
```

---

## Task 2: Schema de validação do consentimento (TDD)

**Files:**
- Test: `tests/unit_test/validation/registration-form-schema.spec.ts`
- Modify: `lib/validation/registration-form-schema.ts`

**Step 1: Escrever os testes que falham**

Acrescentar ao final de `tests/unit_test/validation/registration-form-schema.spec.ts`:

```ts
describe("buildSchema — image_authorization", () => {
  it("sem a flag, não adiciona o campo de consentimento", () => {
    const schema = buildSchema([]);
    // objeto vazio é válido quando não há campos nem consentimento exigido
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("com a flag, exige image_authorization = true", () => {
    const schema = buildSchema([], true);
    const missing = schema.safeParse({});
    expect(missing.success).toBe(false);

    const unchecked = schema.safeParse({ image_authorization: false });
    expect(unchecked.success).toBe(false);
    if (!unchecked.success) {
      expect(unchecked.error.issues[0].message).toBe(
        "Autorização de uso de imagem é obrigatória",
      );
    }

    expect(schema.safeParse({ image_authorization: true }).success).toBe(true);
  });

  it("defaultValues com a flag inclui image_authorization = false", () => {
    expect(defaultValues([], true).image_authorization).toBe(false);
    expect("image_authorization" in defaultValues([])).toBe(false);
  });
});
```

Adicionar `defaultValues` ao import no topo do arquivo de teste:

```ts
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";
```

**Step 2: Rodar e confirmar falha**

Run: `npx vitest run tests/unit_test/validation/registration-form-schema.spec.ts`
Expected: FAIL (arity de `buildSchema`/`defaultValues` + campo ausente).

**Step 3: Implementação mínima**

Em `lib/validation/registration-form-schema.ts`:

```ts
export function buildSchema(
  fields: PublicFormField[],
  requireImageAuthorization = false,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    // ... corpo existente inalterado ...
  }
  if (requireImageAuthorization) {
    shape["image_authorization"] = z
      .boolean()
      .refine((v) => v, "Autorização de uso de imagem é obrigatória");
  }
  return z.object(shape);
}

export function defaultValues(
  fields: PublicFormField[],
  requireImageAuthorization = false,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    // ... corpo existente inalterado ...
  }
  if (requireImageAuthorization) values["image_authorization"] = false;
  return values;
}
```

**Step 4: Rodar e confirmar verde**

Run: `npx vitest run tests/unit_test/validation/registration-form-schema.spec.ts`
Expected: PASS (todos, incluindo os antigos).

**Step 5: Commit**

```bash
git add lib/validation/registration-form-schema.ts tests/unit_test/validation/registration-form-schema.spec.ts
git commit -m "feat: image_authorization consent field in registration schema"
```

---

## Task 3: Checkbox de consentimento no form público

**Files:**
- Modify: `app/(public)/e/[slug]/registration-form.tsx`

**Step 1: Nova prop + wiring do schema**

Adicionar `requireImageAuthorization` às props e passar para `buildSchema`/`defaultValues`:

```tsx
export function RegistrationForm({
  slug,
  fields,
  successMessage,
  postSubscriptionLink,
  requireImageAuthorization = false,
}: {
  slug: string;
  fields: PublicFormField[];
  successMessage?: string;
  postSubscriptionLink?: string;
  requireImageAuthorization?: boolean;
}) {
  // ...
  const schema = useMemo(
    () => buildSchema(visibleFields, requireImageAuthorization),
    [visibleFields, requireImageAuthorization],
  );

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(visibleFields, requireImageAuthorization),
  });
```

**Step 2: Renderizar o checkbox**

Imports no topo:

```tsx
import { Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
```

Dentro do `<form>`, após `<FormFieldsRenderer .../>` (L108) e antes do `<Button type="submit">` (L111):

```tsx
{requireImageAuthorization && (
  <Controller
    control={form.control}
    name="image_authorization"
    render={({ field, fieldState }) => (
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={field.value === true}
            onCheckedChange={(v) => field.onChange(v === true)}
            className="mt-0.5"
          />
          <span>
            Autorizo o uso da minha imagem conforme o{" "}
            <a
              href="/autorizacao-imagem.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              termo de uso de imagem
            </a>
            .
          </span>
        </label>
        {fieldState.error && (
          <p className="text-sm text-destructive">{fieldState.error.message}</p>
        )}
      </div>
    )}
  />
)}
```

**Step 3: Verificar tipos + lint do arquivo**

Run: `npx tsc --noEmit`
Expected: sem novos erros. (Confirmar que `@/components/ui/checkbox` existe; se não, usar o mesmo componente de checkbox que `components/forms/form-fields-renderer` importa.)

**Step 4: Commit**

```bash
git add "app/(public)/e/[slug]/registration-form.tsx"
git commit -m "feat: image authorization consent checkbox on public form"
```

---

## Task 4: Página pública passa a flag

**Files:**
- Modify: `app/(public)/e/[slug]/page.tsx:163-168`

**Step 1: Passar a prop**

No render de `<RegistrationForm>`, adicionar:

```tsx
<RegistrationForm
  slug={slug}
  fields={fields}
  successMessage={event.postRegistrationMessage}
  postSubscriptionLink={event.linkPostSubscription}
  requireImageAuthorization={event.requireImageAuthorization}
/>
```

**Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

**Step 3: Commit**

```bash
git add "app/(public)/e/[slug]/page.tsx"
git commit -m "feat: pass requireImageAuthorization to public registration form"
```

---

## Task 5: Toggle do organizador (Switch)

**Files:**
- Modify: `app/(dashboard)/events/[id]/form/page.tsx` (`FormMetaEditor` L213–347)

**Step 1: Estado + seed + dirty + save**

Adicionar estado (após L229):

```tsx
const [requireImageAuthorization, setRequireImageAuthorization] = useState(false);
```

No `useEffect` de seed (L232–236):

```tsx
setRequireImageAuthorization(form?.requireImageAuthorization ?? false);
```

Na dirty check (L238–241), acrescentar cláusula:

```tsx
|| requireImageAuthorization !== (form?.requireImageAuthorization ?? false)
```

No `update.mutate({...})` (L258–262), acrescentar:

```tsx
requireImageAuthorization,
```

**Step 2: Renderizar o Switch (só registration)**

Dentro do `CardContent` (após o bloco de tabs+input, antes do `<div className="flex justify-end">` do Salvar, ~L333):

```tsx
{kind === "registration" && (
  <div className="flex items-center justify-between gap-4 rounded-md border p-3">
    <div className="space-y-1">
      <Label htmlFor="require-image-auth">
        Exigir autorização de uso de imagem
      </Label>
      <p className="text-sm text-muted-foreground">
        O inscrito precisa aceitar o termo de uso de imagem para concluir a inscrição.
      </p>
    </div>
    <Switch
      id="require-image-auth"
      checked={requireImageAuthorization}
      onCheckedChange={setRequireImageAuthorization}
      disabled={readonly}
    />
  </div>
)}
```

(`Switch` e `Label` já são importados neste arquivo — usados por `PipedriveToggle`.)

**Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

**Step 4: Commit**

```bash
git add "app/(dashboard)/events/[id]/form/page.tsx"
git commit -m "feat: organizer toggle for require image authorization"
```

---

## Task 6: Verificação final

**Step 1: Suite unit completa**

Run: `npm run test`
Expected: PASS (verde).

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: sem erros.

**Step 3: Build**

Run: `npm run build`
Expected: build OK.

**Step 4: Smoke manual (opcional)**

`npm run dev -- -p 3001`, ativar o Switch num evento, abrir a página pública, confirmar checkbox obrigatório e link do PDF, e que submeter sem marcar exibe o erro do backend (toast) quando a flag está on.

---

## Fora de escopo (YAGNI)

- Sem termo inline/expansível — só link PDF.
- Sem config global de conta.
- Sem exibir `imageAuthorization` da response 201 na UI.
- Sem novo teste e2e (cobertura de schema em unit cobre a regra; smoke manual valida a UI).
