# Refatoração e limpeza profunda — ATZ_SED_FRONTEND

## Context

Frontend cresceu de forma inconsistente. Diagnóstico (3 agentes Explore + 1 agente Plan)
mostra que a **arquitetura base já é boa** — não precisa reescrita, precisa uniformização:

- Stack: Next.js 14 App Router, TS strict, Tailwind + shadcn/ui, TanStack React Query,
  react-hook-form + zod. Supabase auth isolado por regra ESLint.
- Camada de dados já disciplinada: todo fetch passa por hooks em `lib/api/*` (React Query).
  Nenhum componente chama `fetch` cru. ✓
- **Feature de referência** (estrutura-alvo): fluxo de **events** — páginas finas,
  hooks em `lib/api/events.ts`, estilos tokenizados.
- **Pior ofensor**: messaging — `send-message-form.tsx` com **1085 linhas** + duplicação
  espalhada por `global-template-dialog.tsx` (422) e `email-layout-editor-modal.tsx` (361).

Objetivo: colapsar duplicação (fazer mais escrevendo menos), quebrar o monólito de
messaging em componentes focados, padronizar tokens de status, reorganizar testes conforme
spec, e limpar código morto + dependências vulneráveis — **sem regressão visual/comportamental**.

**Duas leis (skill refat_front):** YAGNI (nenhuma abstração para 1 consumidor) e
"fazer mais escrevendo menos" (compartilhar, nunca copy-paste).

## Princípios de design (exigência do usuário)
Polimorfismo e reuso **sempre que couber**, para eliminar duplicação, maximizar
legibilidade e impor padrão de organização. Em React/TS, polimorfismo idiomático =
**dispatch por tipo (mapa de estratégia), união discriminada e componentes genéricos**;
herança expressa-se por **composição** (base genérico + config por variante). Herança de
classe só se surgir caso real (raro aqui) — caso contrário composição, forma nativa de
reuso do React. Alvos concretos de polimorfismo abaixo (2D/2E). **Padrão de organização:**
toda feature segue o layout da referência (events): página fina → hooks `lib/api/*` →
componentes focados → estilos tokenizados; nome uniforme de pastas/arquivos.

## Decisões aprovadas
- **Escopo de contrato:** renomear props/APIs de componentes livremente, documentando cada
  breaking change.
- **Testes:** reorg completa → `unit_test/<area>/<coisa>.spec.<ext>` + `integration_test/`
  + `mutation_test/` (scaffold + README, sem instalar Stryker). E2E fica em `tests/e2e`.
- **Cores de status:** adicionar tokens semânticos `--success`/`--neutral` (valores idênticos
  aos atuais → zero mudança visual) e migrar `status-maps.ts`.
- **Audit de deps:** auto-fix de versões não-breaking; breaking listadas p/ decisão manual.

---

## FASE 0 — Setup
- `git checkout -b feat/limpeza_profunda` a partir de `main` atualizada.
- Criar `docs/plans/2026-07-01-refat-front.md` (cópia deste plano — doc de execução exigido
  pela skill e o `REFACTOR_PLAN.md` do comando).
- Rodar baseline verde: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm run test`.
  Registrar estado. Não avançar se já quebrado.

## FASE 1 — Diagnóstico (CONCLUÍDA — read-only)
Diagnóstico consolidado acima. Sem alteração de código nesta fase.

## FASE 2 — Refatoração (sequencial, 1 commit lógico por passo)

### 2A — Fundações compartilhadas (primeiro; tudo abaixo reusa)
1. `lib/messages/composer-constants.ts` — mover duplicados byte-idênticos:
   `NO_TEMPLATE`, `NO_EVENT`, `EMAIL_PREVIEW_MIN_HEIGHT` (o `minHeight:"300px"`),
   `TONE_OPTIONS`, `STEP_LABEL_CLASS`, `isBodyHtml(body)` (regex exato `/^<[a-zA-Z!]/`).
2. `lib/messages/attachments.ts` — mover helpers puros `readAsAttachment`, `base64Bytes`,
   `formatBytes`.
3. Hooks compartilhados (só onde há reuso real — 2+ consumidores):
   - `use-iframe-autosize()` → `{ iframeRef, onLoad }`
   - `use-variable-insertion(value, setValue)` → `{ textareaRef, insertVariable }`
   - `useEmailComposer(initial?)` — dono de `channel/subject/body/activeStyle/layoutConfig/
     layoutEditorOpen`, com `applyPreset(key, opts?)` (`opts.paragraph1` preserva injeção do
     send-form), `changeChannel`, `applyLayout`, `open/closeLayoutEditor`, `reset(init?)`,
     `bodyIsHtml`. **Fora do hook (send-form-specific):** `templateId`/`selectTemplate`/
     `resolveTemplateSelection` e todo estado de convite — mantém o dialog e seu render-test
     intactos.
4. Tokens semânticos: adicionar `--success`/`--neutral` (light+dark) em `app/globals.css`
   com valores idênticos aos verdes/zinc atuais; mapear em `tailwind.config.ts`.

### 2B — Adoção do composer (dialog primeiro = tem o único render-test como rede)
5. Trocar constantes duplicadas nos 3 componentes pelos imports de `composer-constants`
   (substituição pura de valor). Rodar `global-template-dialog.test.tsx` logo após.
6. Wire `use-iframe-autosize` + `use-variable-insertion`.
7. Adotar `useEmailComposer` em `global-template-dialog.tsx` — manter o `useEffect([open,
   template])` de hidratação próprio do dialog (hook expõe `reset()` puro, não briga com o
   effect). 4 asserts do teste são o gate.
8. Adotar `useEmailComposer` em `send-message-form.tsx`, mantendo convite + seleção de
   template no container.

### 2C — Quebra do monólito send-message-form (1 commit por leaf)
Nova pasta `components/messages/send-message/`. Extrair filhos apresentacionais:
`message-body-editor.tsx`, `email-body-preview.tsx`, `recipient-table.tsx`,
`manual-recipient-popover.tsx`, `whatsapp-groups-popover.tsx`, `attachment-list.tsx`,
`manual-recipient-list.tsx`, `send-summary-rail.tsx`.
Estado que **fica no container**: `draft`/`count`/`validationError`, cluster do composer,
estado de convite, `selected`, `manualRecipients`, `attachments`, mutation `sendMessage`.
Estado que **desce**: `manualDraft`/`manualOpen`, `groupsOpen`+query, ref do iframe,
ref do textarea.

### 2D — Consolidar via polimorfismo/composição (matar duplicação)
9. **Dispatch por tipo de campo (polimorfismo):** `form-fields-renderer.tsx` renderiza
   por tipo (text/select/radio/checkbox/image/phone…) e `attendee-detail-sheet.tsx`
   formata resposta por tipo — ambos com lógica paralela. Criar **registry por tipo**
   (`lib/forms/field-types.ts`): mapa `FieldType → { render, format, parseOptions }`.
   Ambos os consumidores despacham pelo registry em vez de switch/if duplicado.
   Consolida `fieldOptions`/`fieldOpts` + `formatAnswer` num só lugar.
10. **Badge genérico (composição sobre herança):** `EventStatusBadge`, `FunnelStatusBadge`,
    `PipedriveBadge` viram um `<StatusBadge variant config />` base + configs por variante
    (união discriminada). Elimina 3 componentes quase-iguais.
11. **Presets/estratégias de email:** unificar `applyPreset`/`applyEmailTemplate` num mapa
    de estratégia keyed por preset (já parcialmente em `lib/email/presets.ts`).
12. Padronizar nomes: badges (`*StatusBadge`), configs (`*StatusConfig`), helpers de campo.
    Documentar renomeações de contrato.

### 2E — Migração de cores para tokens
13. `lib/utils/status-maps.ts` + alertas ad-hoc (`events/[id]/edit/page.tsx`,
    `messages/page.tsx`, `registration-form.tsx`, `auth-background.tsx` gradiente inline)
    → classes tokenizadas (`--success`/`--neutral`/`--danger`/`--warn`). Zero mudança visual.

### 2F — Reorganização de testes
14. Mover 11 testes p/ `unit_test/<area>/*.spec.{ts,tsx}`:
    - `client`, `sse` → `unit_test/api/`
    - `event-schema`, `send-message` → `unit_test/validation/`
    - `build-email` → `unit_test/email/`
    - `resolve-template-selection`, `global-template-dialog` → `unit_test/messages/`
    - `date-time-picker*`  → `unit_test/date-time/`
    - `answer-key` → `unit_test/forms/`
    - `transition-maps` → `unit_test/status/`
    Renomear `.test.` → `.spec.`. Criar `integration_test/` e `mutation_test/` (README).
    Atualizar glob do `vitest.config.ts`. Ajustar imports quebrados por mudança de path.

Cada passo: `build` + `tsc` + `test` verdes antes do próximo.

## FASE 3 — Limpeza e segurança (nesta ordem)
1. **Dirs vazios / markers:** listar candidatos + evidência, remover. (Diagnóstico: nenhum
   `.gitkeep`, nenhum dir vazio real — só `.next/cache`, ignorado.)
2. **Código/assets mortos:** rodar regra unused do ESLint + busca de referências.
   `calendar-rac.tsx` é usado via import dinâmico — **não remover**. imgs auth_background
   1-9 todas referenciadas — manter. Listar qualquer export órfão com evidência antes de
   remover.
3. **Audit de deps:** `npm audit`; bump não-breaking p/ versão sem vuln; breaking →
   lista separada p/ decisão manual; re-audit; anotar ganhos de bundle.

## Verificação end-to-end
- `npm run build` limpo, `npx tsc --noEmit` limpo, `npm run lint` limpo.
- `npm run test` (vitest) verde na nova estrutura `unit_test/`.
- `npm run test:e2e` (Playwright) se backend disponível; senão smoke manual.
- `npm audit` limpo (ou só itens breaking listados).
- Smoke manual: 1 rota por feature (events list, event edit, messages/send, public /e/[slug]).
- Confirmar sem regressão visual (tokens = valores idênticos; extrações preservam markup).

## Riscos-chave (do agente de design)
- **Coordenação de estado do dialog:** manter `useEffect([open,template])` próprio; hook só
  expõe `reset()` puro. Alto risco se hook assumir lifecycle open/close.
- **`applyPreset` paragraph1:** send-form injeta corpo no `paragraph1`; dialog não. Usar
  `opts.paragraph1` opcional + teste unit focado (send-path não tem teste).
- **`changeChannel` reset de convite:** só o form limpa convite — manter no container.
- **Draft localStorage do layout-editor:** não mudar derivação de `draftKey` nem shape de
  `initialConfig`, senão prompts de draft/dirty misfire.
- **Hooks novos puros (useState):** sem React Query direto, senão `global-template-dialog.
  test.tsx` (sem QueryClientProvider) quebra.

## Entrega final
- Resumo por fase; arquitetura/estrutura adotada; estado de build/lint/type-check/testes/
  audit/bundle; lista de breaking changes de contrato; itens de decisão manual (breaking deps).
