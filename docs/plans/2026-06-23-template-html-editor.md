# Editor + seletor de HTML no template de mensagem — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dar ao `GlobalTemplateDialog` o mesmo seletor de presets + botão "Editar layout" + preview do `SendMessageForm`, persistindo HTML + config + style key no template (canal e-mail), e fazer o `SendMessageForm` consumir o HTML salvo.

**Architecture:** Reaproveita `EMAIL_LAYOUT_PRESETS`, `buildEmail` e `EmailLayoutEditorModal`. Tipos ganham `layoutConfig` + `styleKey`. Lógica de seleção de template no send-form é extraída para helper puro e testável. Componente do diálogo testado com Vitest + React Testing Library.

**Tech Stack:** Next.js, React, TypeScript, TanStack Query, Radix UI, Vitest, React Testing Library.

**Pré-requisito backend (repo separado — NÃO neste plano):** colunas `layout_config` (JSON, nullable) e `style_key` (varchar, nullable) na tabela de templates, aceitas/retornadas em create/update/get/list. Sem isso o frontend envia mas o backend descarta — config/estilo não persistem entre sessões. As tarefas abaixo são frontend-only e funcionam com mocks; integração real depende do backend.

Design: `docs/plans/2026-06-23-template-html-editor-design.md`

---

### Task 1: Campos `layoutConfig` e `styleKey` nos tipos

**Files:**
- Modify: `lib/api/types.ts:133-143` (`MessageTemplate`)
- Modify: `lib/api/templates.ts:8-13` (`TemplateInput`)

**Step 1: Editar `MessageTemplate`**

Em `lib/api/types.ts`, adicionar imports no topo (junto aos demais types) e os 2 campos:

```typescript
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";
```

```typescript
export interface MessageTemplate {
  id: string;
  eventId: string | null;
  name: string;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  layoutConfig: EmailLayoutConfig | null;
  styleKey: EmailTemplateKey | null;
  createdAt: string;
  updatedAt: string;
}
```

> Se `lib/email/email-layout-config` ou `lib/email-templates` importarem de `types.ts` (ciclo), usar `import type` (já usado) — ciclos de type-only são seguros no TS. Verificar no Step 3.

**Step 2: Editar `TemplateInput`**

Em `lib/api/templates.ts`:

```typescript
import type {
  MessageChannel,
  MessageTemplate,
  PaginatedResponse,
} from "@/lib/api/types";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";

export interface TemplateInput {
  name: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
  layoutConfig?: EmailLayoutConfig | null;
  styleKey?: EmailTemplateKey | null;
}
```

**Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos). Se aparecer ciclo de import, confirmar que todos os imports novos usam `import type`.

**Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/templates.ts
git commit -m "feat: add layoutConfig and styleKey to template types"
```

---

### Task 2: Helper puro de resolução de template no envio

Extrai a lógica de "ao selecionar um template, o que vai para body/subject/layoutConfig/activeStyle" para função pura testável.

**Files:**
- Create: `lib/messages/resolve-template-selection.ts`
- Test: `tests/unit/resolve-template-selection.test.ts`

**Step 1: Escrever o teste que falha**

```typescript
import { describe, expect, it } from "vitest";
import { resolveTemplateSelection } from "@/lib/messages/resolve-template-selection";
import type { MessageTemplate } from "@/lib/api/types";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";

const base: MessageTemplate = {
  id: "t1",
  eventId: null,
  name: "T",
  channel: "email",
  subject: "Assunto",
  body: "corpo",
  layoutConfig: null,
  styleKey: null,
  createdAt: "",
  updatedAt: "",
};

describe("resolveTemplateSelection", () => {
  it("sem template limpa body/subject/layout", () => {
    expect(resolveTemplateSelection(null, "email")).toEqual({
      body: "",
      subject: "",
      layoutConfig: null,
      activeStyle: null,
    });
  });

  it("template HTML (layoutConfig presente) usa body salvo direto", () => {
    const cfg = EMAIL_LAYOUT_PRESETS.minimalista;
    const html = buildEmail(cfg);
    const tpl: MessageTemplate = {
      ...base,
      body: html,
      layoutConfig: cfg,
      styleKey: "minimalista",
    };
    expect(resolveTemplateSelection(tpl, "email")).toEqual({
      body: html,
      subject: "Assunto",
      layoutConfig: cfg,
      activeStyle: "minimalista",
    });
  });

  it("template texto puro mantém body como texto e sem layout", () => {
    const tpl: MessageTemplate = { ...base, body: "Olá {{nome}}" };
    expect(resolveTemplateSelection(tpl, "email")).toEqual({
      body: "Olá {{nome}}",
      subject: "Assunto",
      layoutConfig: null,
      activeStyle: null,
    });
  });

  it("canal whatsapp ignora subject", () => {
    const tpl: MessageTemplate = { ...base, channel: "whatsapp", body: "oi" };
    const r = resolveTemplateSelection(tpl, "whatsapp");
    expect(r.subject).toBe("");
    expect(r.body).toBe("oi");
  });
});
```

**Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/resolve-template-selection.test.ts`
Expected: FAIL ("Cannot find module .../resolve-template-selection").

**Step 3: Implementar**

```typescript
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";
import type { MessageChannel, MessageTemplate } from "@/lib/api/types";

export interface TemplateSelection {
  body: string;
  subject: string;
  layoutConfig: EmailLayoutConfig | null;
  activeStyle: EmailTemplateKey | null;
}

export function resolveTemplateSelection(
  template: MessageTemplate | null,
  channel: MessageChannel,
): TemplateSelection {
  if (!template) {
    return { body: "", subject: "", layoutConfig: null, activeStyle: null };
  }
  const subject = channel === "email" ? (template.subject ?? "") : "";
  if (channel === "email" && template.layoutConfig) {
    return {
      body: template.body,
      subject,
      layoutConfig: template.layoutConfig,
      activeStyle: template.styleKey,
    };
  }
  return { body: template.body ?? "", subject, layoutConfig: null, activeStyle: null };
}
```

**Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/resolve-template-selection.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/messages/resolve-template-selection.ts tests/unit/resolve-template-selection.test.ts
git commit -m "feat: add resolveTemplateSelection helper"
```

---

### Task 3: `SendMessageForm` consome HTML salvo

**Files:**
- Modify: `components/messages/send-message-form.tsx:223-238` (`selectTemplate`)

**Step 1: Reescrever `selectTemplate`**

Importar o helper no topo:

```typescript
import { resolveTemplateSelection } from "@/lib/messages/resolve-template-selection";
```

Substituir a função `selectTemplate` (linhas ~223-238) por:

```typescript
function selectTemplate(value: string) {
  const id = value === NO_TEMPLATE ? null : value;
  setTemplateId(id);
  const tpl = id ? (channelTemplates.find((t) => t.id === id) ?? null) : null;
  const sel = resolveTemplateSelection(tpl, channel);
  if (channel === "email") setSubject(sel.subject);
  setLayoutConfig(sel.layoutConfig);
  setActiveStyle(sel.activeStyle);
  setBody(sel.body);
}
```

> Comportamento antigo reinjetava `tpl.body` em `paragraph1` de um preset. Agora templates de e-mail já guardam HTML completo, então usamos direto. Templates antigos (sem `layoutConfig`) caem no caminho texto puro.

**Step 2: Typecheck + testes existentes do send-message**

Run: `npx tsc --noEmit && npx vitest run tests/unit/send-message.test.ts`
Expected: PASS.

**Step 3: Smoke manual (opcional)**

Run: `npm run dev` → abrir página de mensagens, selecionar um template (mock/back) e confirmar que body carrega. Pular se backend indisponível.

**Step 4: Commit**

```bash
git add components/messages/send-message-form.tsx
git commit -m "feat: send form loads stored HTML from template"
```

---

### Task 4: Editor + seletor de HTML no `GlobalTemplateDialog`

**Files:**
- Modify: `components/messages/global-template-dialog.tsx` (todo o componente)
- Test: `tests/unit/global-template-dialog.test.tsx`

**Step 1: Escrever testes que falham**

```typescript
import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const updateMutate = vi.fn();
const createMutate = vi.fn();

vi.mock("@/lib/api/global-messaging", () => ({
  useCreateTemplateGlobal: () => ({ mutate: createMutate, isPending: false }),
  useUpdateTemplateGlobal: () => ({ mutate: updateMutate, isPending: false }),
}));

import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import type { TemplateWithEvent } from "@/lib/api/types";

afterEach(() => cleanup());
beforeEach(() => {
  updateMutate.mockClear();
  createMutate.mockClear();
});

const emailTpl: TemplateWithEvent = {
  id: "t1",
  eventId: null,
  name: "Boas-vindas",
  channel: "email",
  subject: "Oi",
  body: buildEmail(EMAIL_LAYOUT_PRESETS.minimalista),
  layoutConfig: EMAIL_LAYOUT_PRESETS.minimalista,
  styleKey: "minimalista",
  createdAt: "",
  updatedAt: "",
  event: null,
};

describe("GlobalTemplateDialog (e-mail)", () => {
  it("mostra preview iframe e botões de preset ao editar template HTML", () => {
    render(
      <GlobalTemplateDialog template={emailTpl} open onOpenChange={() => {}} />,
    );
    expect(screen.getByTitle(/preview/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /editar layout/i })).toBeTruthy();
  });

  it("salva com layoutConfig e styleKey", () => {
    render(
      <GlobalTemplateDialog template={emailTpl} open onOpenChange={() => {}} />,
    );
    screen.getByRole("button", { name: /^salvar$/i }).click();
    expect(updateMutate).toHaveBeenCalledTimes(1);
    const arg = updateMutate.mock.calls[0][0];
    expect(arg.input.styleKey).toBe("minimalista");
    expect(arg.input.layoutConfig).toBeTruthy();
    expect(arg.input.body).toContain("<");
  });
});

describe("GlobalTemplateDialog (whatsapp)", () => {
  it("não mostra editor de layout no canal whatsapp", () => {
    const wa: TemplateWithEvent = {
      ...emailTpl,
      channel: "whatsapp",
      body: "Olá {{nome}}",
      layoutConfig: null,
      styleKey: null,
    };
    render(<GlobalTemplateDialog template={wa} open onOpenChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /editar layout/i })).toBeNull();
  });
});
```

> Nota: o canal é controlado por Radix Select (difícil de operar em jsdom). Os testes usam o modo **edição** (prop `template`) para renderizar direto o canal desejado sem interagir com o Select.

**Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/global-template-dialog.test.tsx`
Expected: FAIL (sem preview iframe / sem botão "Editar layout" / input sem styleKey).

**Step 3: Reescrever `GlobalTemplateDialog`**

Substituir o conteúdo de `components/messages/global-template-dialog.tsx`. Pontos-chave (espelhar o `SendMessageForm`):

- Imports adicionais:
  ```typescript
  import { useCallback } from "react";
  import { Paintbrush } from "lucide-react";
  import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email-templates";
  import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
  import { buildEmail } from "@/lib/email/build-email";
  import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
  import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
  ```
- Estado novo:
  ```typescript
  const [activeStyle, setActiveStyle] = useState<EmailTemplateKey | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<EmailLayoutConfig | null>(null);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  ```
- `useEffect` de init (ampliar o existente em :52-59):
  ```typescript
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setChannel(template?.channel ?? "whatsapp");
      setSubject(template?.subject ?? "");
      setBody(template?.body ?? "");
      setLayoutConfig(template?.layoutConfig ?? null);
      setActiveStyle(template?.styleKey ?? null);
      setLayoutEditorOpen(false);
    }
  }, [open, template]);
  ```
- `bodyIsHtml` + handlers (copiar de send-form):
  ```typescript
  const bodyIsHtml = /^<[a-zA-Z!]/.test(body.trim());

  function applyPreset(key: EmailTemplateKey) {
    const cfg = EMAIL_LAYOUT_PRESETS[key];
    setLayoutConfig(cfg);
    setBody(buildEmail(cfg));
    setActiveStyle(key);
  }

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    if (next !== "email") {
      setBody("");
      setActiveStyle(null);
      setLayoutConfig(null);
    }
  }

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;
    const doc = iframe.contentDocument;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    if (h > 0) iframe.style.height = `${h + 4}px`;
  }, []);
  ```
- Trocar o `onValueChange` do Select de canal para `changeChannel`.
- `handleSave` inclui os novos campos:
  ```typescript
  const input = {
    name: name.trim(),
    channel,
    subject: channel === "email" ? subject.trim() || undefined : undefined,
    body,
    layoutConfig: channel === "email" ? layoutConfig : null,
    styleKey: channel === "email" ? activeStyle : null,
  };
  ```
- Bloco "Mensagem" (substituir :147-188). Quando `channel === "email"`: header com label + botão "Editar layout" (`disabled={!activeStyle}`, ícone Paintbrush, `onClick={() => setLayoutEditorOpen(true)}`); coluna/linha de botões de preset (`Object.keys(EMAIL_LAYOUT_PRESETS)` → `applyPreset(key)`, `variant={activeStyle === key ? "default" : "outline"}`, label `EMAIL_TEMPLATE_LABELS[key]`); corpo condicional:
  ```tsx
  {bodyIsHtml ? (
    <iframe
      ref={iframeRef}
      srcDoc={body}
      title="preview do e-mail"
      scrolling="no"
      className="block w-full overflow-hidden rounded-md border"
      style={{ minHeight: "300px" }}
      sandbox="allow-same-origin"
      onLoad={handleIframeLoad}
    />
  ) : (
    <VariableTextarea id="gtpl-body" ref={bodyRef} rows={6} value={body}
      onChange={(e) => setBody(e.target.value)} />
  )}
  ```
  Os botões de variável e o popover ficam só no modo texto (`!bodyIsHtml`). WhatsApp = bloco atual (textarea + variáveis) inalterado.
- No fim do JSX (antes de fechar `Dialog`), montar o editor:
  ```tsx
  <EmailLayoutEditorModal
    open={layoutEditorOpen}
    initialConfig={layoutConfig}
    draftKey={`gtpl-${template?.id ?? "new"}`}
    onSave={(cfg, html) => {
      setLayoutConfig(cfg);
      setBody(html);
      setLayoutEditorOpen(false);
    }}
    onClose={() => setLayoutEditorOpen(false)}
  />
  ```

**Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/global-template-dialog.test.tsx`
Expected: PASS. Se o teste de save falhar por validação, garantir que `name` e `body` do `emailTpl` não estão vazios (estão).

**Step 5: Commit**

```bash
git add components/messages/global-template-dialog.tsx tests/unit/global-template-dialog.test.tsx
git commit -m "feat: HTML layout editor in message template dialog"
```

---

### Task 5: Verificação final

**Step 1: Lint + typecheck + suíte completa**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: tudo PASS, sem warnings novos de lint.

**Step 2: Build**

Run: `npm run build`
Expected: build OK.

**Step 3: Commit (se algo foi ajustado)**

```bash
git add -A
git commit -m "chore: lint/typecheck fixes for template HTML editor"
```

---

## Notas
- Backend deve persistir `layout_config` + `style_key`; até lá, reabrir após reload do backend perde a config (cai em texto puro). Comportamento degradado é seguro (sem crash).
- Templates antigos (campos null) seguem funcionando como texto puro.
- DRY: lógica de seleção centralizada em `resolveTemplateSelection`; preset/buildEmail reusados.
