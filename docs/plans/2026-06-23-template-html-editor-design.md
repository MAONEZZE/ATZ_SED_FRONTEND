# Design: Editor + seletor de HTML no editor de template de mensagem

Data: 2026-06-23

## Objetivo

O `GlobalTemplateDialog` (criar/editar template de mensagem) deve ter o mesmo
seletor de presets de layout + botão "Editar layout" (modal `EmailLayoutEditorModal`)
+ preview em iframe que já existem no `SendMessageForm`. Assim o template passa a
**armazenar o HTML gerado** (não mais só texto puro) para o canal e-mail.

Decisões:
- HTML **e** config visual persistidos (round-trip de edição completo).
- A preset key (estilo destacado) também é persistida.
- Recurso só no canal **e-mail**; WhatsApp continua textarea de texto puro.
- Escopo inclui o `SendMessageForm` consumir o HTML salvo ao selecionar o template.

## Backend (repositório separado — pré-requisito)

Tabela de templates precisa de 2 colunas novas (nullable):
- `layout_config` — JSON (serialização de `EmailLayoutConfig`).
- `style_key` — varchar (`minimalista | profissional | acolhedor | elegante`).

Endpoints de create/update/get/list de templates devem aceitar e retornar ambos
(camelCase ↔ snake_case conforme convenção do backend). **Sem isso, o frontend
envia os campos mas o backend os descarta** — config e estilo não persistem entre sessões.

## Frontend

### 1. Tipos e API
- `lib/api/types.ts` → `MessageTemplate`: adicionar
  `layoutConfig: EmailLayoutConfig | null` e `styleKey: EmailTemplateKey | null`.
- `lib/api/templates.ts` → `TemplateInput`: adicionar
  `layoutConfig?: EmailLayoutConfig | null` e `styleKey?: EmailTemplateKey | null`.
- Importar `EmailLayoutConfig` (de `lib/email/email-layout-config`) e
  `EmailTemplateKey` (de `lib/email-templates`).

### 2. `GlobalTemplateDialog` (só canal e-mail)
Reaproveita a lógica do `SendMessageForm`:
- Estado novo: `activeStyle: EmailTemplateKey | null`, `layoutConfig: EmailLayoutConfig | null`,
  `layoutEditorOpen: boolean`.
- `useEffect` de init (já existe p/ open/template): restaurar
  `body`, `layoutConfig` e `activeStyle` (= `template.styleKey`).
- Quando `channel === "email"`:
  - Coluna de botões de preset (`EMAIL_LAYOUT_PRESETS`) → `applyEmailTemplate(key)`:
    `cfg = EMAIL_LAYOUT_PRESETS[key]`, `setLayoutConfig(cfg)`,
    `setBody(buildEmail(cfg))`, `setActiveStyle(key)`.
  - Botão "Editar layout" (ícone Paintbrush), `disabled={!activeStyle}` →
    abre `EmailLayoutEditorModal` com `initialConfig={layoutConfig}` e
    `draftKey={`gtpl-${template?.id ?? "new"}`}`. `onSave(cfg, html)` →
    `setLayoutConfig(cfg)` + `setBody(html)`.
  - Corpo: `bodyIsHtml = /^<[a-zA-Z!]/.test(body.trim())` → iframe de preview
    (mesmo padrão do send-form, `handleIframeLoad`); senão `VariableTextarea` atual.
  - Botões de variável e popover de variáveis: mantidos só no modo texto.
- `handleChannel`: ao trocar canal, resetar `body`, `activeStyle`, `layoutConfig`.
- `handleSave`: incluir `layoutConfig` e `styleKey: activeStyle` no input
  (ambos só quando `channel === "email"`; WhatsApp manda `null`/omitido).
- WhatsApp: comportamento atual inalterado.

### 3. `SendMessageForm.selectTemplate` (linha ~223)
- Se o template selecionado tem `layoutConfig` (canal e-mail):
  `setLayoutConfig(tpl.layoutConfig)`, `setActiveStyle(tpl.styleKey)`,
  `setSubject(tpl.subject ?? "")`, `setBody(tpl.body)` — usar HTML salvo direto,
  **sem** reinjetar `paragraph1`.
- Senão: comportamento atual (texto puro / preset + paragraph1).

## Fluxo de dados

Criar template e-mail → escolhe preset → (opcional) Editar layout →
`body = HTML`, `layoutConfig = cfg`, `styleKey = key` → salva no backend.
Editar template → restaura preview + editor com a config salva.
Enviar mensagem → seleciona template → carrega HTML+config direto no send-form.

## Erros / edge cases
- Template antigo sem `layoutConfig`/`styleKey` (null): cai no caminho de texto puro;
  nenhum preset destacado; usuário pode escolher preset p/ migrar.
- Trocar canal e-mail→whatsapp limpa HTML/config para evitar enviar HTML por WhatsApp.
- `handleSave` valida `name` + `body` (já existe).

## Testes
- Criar template e-mail com preset → body é HTML, config/styleKey persistem (mock API).
- Reabrir template salvo → preview renderiza, preset certo destacado, editor restaura config.
- Canal WhatsApp → sem seletor/editor, textarea texto puro.
- send-form: selecionar template HTML → body carrega HTML sem reinjeção.
