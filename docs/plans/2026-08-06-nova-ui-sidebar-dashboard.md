# Nova UI: paleta verde/ink, menu lateral colapsável e dashboard

Data: 2026-08-06 · Branch: `feature/novo_ui` (sem branch nova, sem worktree)

## Contexto

O app logado tem hoje uma navbar horizontal (`components/layout/app-shell.tsx`) com dois links, sem menu mobile, e a home pós-login é a listagem `/events`. A paleta implementada é a "Marrom macOS" (marrom/creme/âmbar) — **não** é a paleta documentada no `CLAUDE.md` §Cores.

A mudança serve de base para funcionalidades futuras: casca de navegação que escala (sidebar aceita itens novos sem competir por espaço horizontal) e uma home com visão geral. Três entregas:

1. Aplicar a paleta do `CLAUDE.md` (verde `#8edd65` / `#2f6b0f`, ink `#0f1a1c`, offwhite `#f4f4f4`).
2. Trocar a navbar por menu lateral expansível/recolhível.
3. Criar `/dashboard` como página inicial do app logado.

### Decisões do usuário (fixas)

- **Conteúdo claro + chrome escuro**: superfícies de conteúdo offwhite/branco com texto ink; sidebar (e seu drawer mobile) escura; `accent-ink #2f6b0f` como `primary` no claro; `accent #8edd65` só sobre superfície escura. Dark mode continua existindo, retintado.
- **Sidebar**: 256px com labels / 64px rail de ícones, estado persistido; <768px vira drawer.
- **Rota**: `/dashboard` novo dentro do grupo `(dashboard)`. Landing pública `/` intacta.

### Divergências do CLAUDE.md a corrigir junto

| Afirmação | Realidade |
|---|---|
| tokens em `src/app/globals.css` | não existe `src/`; é `app/globals.css` |
| ratios "travados por `tests/color-contrast.test.ts`" | arquivo não existe (Vitest coleta `tests/unit_test/**/*.spec.ts`) |
| ratios computados em `docs/plans/plano-seo-geo-site-akeel.md` §2 | arquivo não existe |
| `tests/brand.test.ts` rejeita hexes do blog em `src/` | arquivo não existe |
| tabela cita `bg-dark` | **sem hex na tabela** |

Os ratios documentados foram recomputados pela fórmula WCAG 2.x e conferem (accent/offwhite 1.51 ✓, accent-ink/offwhite ~5.8 vs 5.91 doc, ink/offwhite ~16.0 vs 16.11 doc, accent-ink/bg-dark-2 2.73 vs 2.71 doc). A paleta é válida; só não estava implementada.

`bg-dark` foi derivado por back-solving do 9.69:1 documentado → **`#13232a`** (dá ~9.7:1 com accent e ~2.5:1 com accent-ink, batendo com o 2.47 do doc). É o **único valor inventado do plano**; se o design fornecer o hex oficial, muda uma linha.

---

## 1. Tokens — `app/globals.css` + `tailwind.config.ts`

Os tokens da tabela entram como tripletas HSL com o hex em comentário, e os tokens shadcn passam a referenciá-los por indireção (`--primary: var(--color-accent-ink)`).

**Tripletas com uma decimal — inteiro corrompe 4 dos 6 hexes** (`100 64% 63%` renderiza `#8ddd64`, não `#8edd65`):

```css
--color-accent:      99.5 63.8% 63.1%;  /* #8edd65 — só sobre escuro */
--color-accent-ink:  99.1 75.4% 23.9%;  /* #2f6b0f — UI/texto sobre claro */
--color-ink:        189.2 30.2% 8.4%;   /* #0f1a1c */
--color-offwhite:      0 0% 95.7%;      /* #f4f4f4 */
--color-bg-dark:   198.3 37.7% 12%;     /* #13232a — derivado */
--color-bg-dark-2: 192.6 44.2% 8.4%;    /* #0c1b1f */
```

Mapeamento shadcn no `:root`: `--background` → offwhite, `--foreground` → ink, `--card` branco, `--primary` → accent-ink com `--primary-foreground` offwhite (5.8:1, AA), `--ring` → accent-ink. No `.dark`: `--background` → bg-dark, `--card` → bg-dark-2, `--foreground` → offwhite, `--primary` → accent com `--primary-foreground` ink.

**Restrição crítica:** `--accent`/`--accent-foreground` do shadcn são *superfície de hover* (dropdown, select, tabs). Não recebem `#8edd65` — se receberem, todo hover do app fica verde-limão. O verde da marca é exposto por nomes novos (`brand`, `brand-ink`), nunca sobrescrevendo a semântica do shadcn.

### Fatos verificados contra o Tailwind instalado (3.4.19)

- `hsl(var(--x))` parseia em modo `loose` e o modificador de alpha gera `hsl(var(--x) / 0.5)`, resolvendo através da indireção. `bg-primary/20` (`components/ui/variable-textarea.tsx:53`) e `bg-muted/50` (`components/ui/table.tsx:40,53`) continuam funcionando. Nunca misturar com a forma `<alpha-value>`.
- `var(--status-success-bg)` (hex cru) → `parseColor` retorna `null` e `bg-status-success-bg/50` **não emite regra nenhuma**. Ninguém usa hoje; não propagar o padrão para os nomes novos.
- Indireção só funciona no mesmo elemento: `:root { --primary: var(--color-accent-ink) }` + um wrapper redefinindo `--color-accent-ink` **não** muda `--primary` nos descendentes. Serve para light/dark (mesmo elemento sob `attribute="class"`), mas mata theming escopado futuro.

### Rampa neutra

`components/ui/*` consome `brown-*` em ~15 pontos e `warn*` em ~8. A rampa atual medida: `brown-900 #2f2119 · 700 #4d3828 · 600 #715038 · 500 #836049 · 300 #c3a98d · 200 #dfceb9 · 100 #eee4d8`.

- `--brown-{900,700,600,500,300,200,100}` → `--ink-{...}`, rederivados de `#0f1a1c`→`#f4f4f4`.
- `--cream`/`--cream-deep` → `--surface`/`--surface-2`.
- `--status-*` ficam; só `--status-success-fg` migra para accent-ink por coesão.
- Novos nomes no `theme.extend.colors`: `brand` / `brand.ink`, `ink`, `offwhite`. **Não** criar `surface-dark`/`surface-dark-2` — duplicaria `--sidebar` e convidaria a pintar bloco escuro dentro de conteúdo claro. `--color-bg-dark`/`-2` ficam como vars de marca não expostas, para onde `--sidebar` aponta.
- Correção de uma linha: `fontFamily.sans` (`tailwind.config.ts:15-25`) lista `'Inter'` puro, mas `app/layout.tsx:9,27` carrega a fonte como `--font-inter`. Hoje a Inter é baixada e nunca usada. Primeiro item passa a ser `'var(--font-inter)'`.

### Onde a renomeação NÃO é mecânica

| Local | Problema |
|---|---|
| `components/ui/button.tsx:12` | `default: bg-primary … hover:bg-brown-500`. Hoje é brown-600→500 (mesmo matiz, mais claro). Com primary verde, `ink-500` teal **muda o matiz no hover**. Precisa de `--color-accent-ink-hover` explícito (`bg-primary/90` compõe contra fundo variável). |
| `components/ui/button.tsx:18` | `ghost: text-brown-600`. `--brown-600` e `--primary` são **a mesma tripleta** (`globals.css:15` vs `:50`) — um valor, duas semânticas. Renomear cego deixa o ghost cinza e sem marca. Bifurcar à mão: `text-primary` (5.96:1 sobre offwhite, passa). |
| `components/ui/table.tsx:53,68` | `--brown-100` é superfície (`bg` do `<th>`) **e** borda (`border-b` do `<tr>`), e também é `--secondary` (`:17`) e `--accent` (`:21`). `ink-100` precisa ficar perto de 89% L ou os divisores de linha desaparecem. |
| `--brown-300` | Já quebrado: texto de aba inativa (`tabs.tsx:17`), placeholder (`input.tsx:11`, `textarea.tsx:10`, `select.tsx:22`) **e** borda de controle (`checkbox.tsx:16`, `radio-group.tsx:31`, `button.tsx:16`). Medido **2.12:1** sobre background — falha 4.5:1 como texto e 3:1 como borda. Retintar no mesmo L preserva a falha: empurrar `ink-300` para ~55-58% L, ou separar `ink-300` (borda) de `ink-400` (placeholder). |
| `components/ui/badge.tsx:12,15` | `brown-100`/`brown-700` são neutros de verdade — migram direto. |

### Âmbar faz papel duplo (o ponto mais escondido)

Hoje `--warn` é aviso **e** cor de marca dos estados ativos/foco. Sob a decisão 1, tudo isso vira verde:

| Arquivo:linha | Atual | Vira |
|---|---|---|
| `components/ui/tabs.tsx:32` | `data-[state=active]:border-warn` (warn sobre background = 2.53:1, falha 3:1) | `border-primary` |
| `components/ui/switch.tsx:14` | `data-[state=checked]:bg-warn` | `bg-primary` |
| `components/ui/input.tsx:11` | `focus-visible:border-warn` | `focus-visible:border-primary` |
| `components/ui/textarea.tsx:10` | `focus-visible:border-warn` | `focus-visible:border-primary` |
| `components/ui/select.tsx:22` | `focus:border-warn` | `focus:border-primary` |
| `globals.css:27` | `--ring` âmbar | `var(--color-accent-ink)` |
| `globals.css:173` (`.eyebrow`) | `hsl(var(--warn-strong))` | accent-ink |
| `globals.css:59` | `--chart-2` âmbar | deixar quieto até um chart existir |

Sem isso, o app fica com primary verde e todo anel de foco laranja. Depois, `warn` sobra só onde é aviso: variante `warn` do `badge.tsx:13` e o banner de readonly.

### Falhas de contraste pré-existentes

Um teste de contraste amplo acende vermelho em falhas que já existem. Como a rampa está sendo rederivada de qualquer jeito, corrigir junto (barato) em vez de aguar o teste no dia 1:

- `--brown-300` em dois papéis (acima).
- `components/ui/button.tsx:14` — variante `destructive` é **âmbar**, e `warn-text` sobre `warn` = **3.05:1**, `white` sobre `warn-strong` = **3.79:1**. Além disso o valor arbitrário `text-[hsl(var(--warn-text))]` não aparece em grep por `text-warn-text`.
- `components/ui/badge.tsx:14` — `bg-danger text-white` = **3.96:1**.
- `components/ui/table.tsx:53` — `dark:hover:bg-white/5` hardcoded briga com o dark retintado.

**Fora de escopo (decisão separada):** a variante `destructive` do botão ser âmbar em vez de `--danger`, sendo que `bg-destructive/90` já é usado direto em 4 call sites (`events/[id]/automations/page.tsx:139`, `events/[id]/form/page.tsx:144`, `events/page.tsx:163`, `messages/page.tsx:204`) — são duas semânticas de "destructive" convivendo.

### Utilitários hardcoded (22 ocorrências / 9 arquivos) — PR separado

Independem dos tokens: banner amarelo duplicado em `events/[id]/edit/page.tsx:113` e `events/[id]/form/page.tsx:475` (extrair `components/common/warning-banner.tsx`), `text-green-600`/`text-blue-600` em `messages/page.tsx:50,52`, checks de sucesso nas 3 páginas públicas, `bg-green-600`/`bg-red-600` em `common/status-badge.tsx:60`, `bg-red-100` em `ui/calendar-rac.tsx:65`, `bg-neutral-200/60` em `email-layout-editor-modal.tsx:272`.

**Nunca tocar:** os 67 hexes em `lib/email/*` e `components/messages/email-layout-editor/editor-fields.tsx` — cores de cliente de e-mail, design system separado, precisam ser hex inline.

---

## 2. Menu lateral

**Usar os `--sidebar-*` que já existem.** `globals.css:71-78` e `:133-140` definem 8 tokens, já mapeados em `tailwind.config.ts:96-105`, com **zero** consumidores. Setando os **mesmos valores escuros no `:root` e no `.dark`**, a sidebar fica escura nos dois temas *por construção* — sem wrapper class, sem override `.dark`, sem `text-offwhite/70` hardcoded, sem mudar o `tailwind.config.ts`:

- `--sidebar` → bg-dark, `--sidebar-foreground` → offwhite
- `--sidebar-primary` → accent `#8edd65`, `--sidebar-primary-foreground` → ink
- `--sidebar-accent` → escuro levantado (hover), `--sidebar-accent-foreground` → offwhite
- `--sidebar-border` → hairline escuro, `--sidebar-ring` → accent

O aside usa só `bg-sidebar text-sidebar-foreground border-sidebar-border`. Texto secundário = `text-sidebar-foreground/70` (~9.5:1 sobre `#13232a`).

**Restrição numérica:** o item ativo **não pode** ser `bg-primary` — accent-ink sobre bg-dark = **2.48:1**, exatamente o par que o `CLAUDE.md` marca como proibido. Ativo = `bg-sidebar-primary` + `text-ink` (10.8:1) ou `bg-sidebar-accent` + `text-sidebar-primary` (accent sobre bg-dark = 9.7:1).

Arquivos novos:

- `hooks/use-sidebar-state.ts` — `{ collapsed, toggle }` persistido via `getDraft`/`setDraft` de `lib/utils/local-draft.ts` (já com try/catch). Renderiza `collapsed=false` no servidor e hidrata no `useEffect` — o layout do grupo é client component, não há como ler cookie no servidor. A `transition-[width]` fica atrás de um flag `mounted` para não animar no primeiro paint.
- `components/layout/sidebar-nav.tsx` — lista única reusada pelo aside e pelo drawer: Dashboard (`/dashboard`, `LayoutDashboard`), Eventos (`/events`, `CalendarDays`), Mensagens (`/messages`, `MessageSquare`), Configurações (`/settings`, `Settings`).
- `components/layout/app-sidebar.tsx` — aside 256px/64px, botão de recolher no rodapé.

Reescrita de `components/layout/app-shell.tsx`:

- **Contrato de scroll** (hoje em `:49`, `:126-127`): o wrapper externo vira `flex h-screen overflow-hidden` em **row**, aside `shrink-0`, coluna direita `flex min-w-0 flex-1 flex-col`, e dentro dela `flex-1 overflow-y-auto` em volta do `main`. O `min-w-0` é estrutural: sem ele o `overflow-auto` de `components/ui/table.tsx:7` alarga a row em vez de rolar internamente, e toda página com tabela larga quebra.
- `max-w-7xl px-4 py-6` do `<main>` continua; páginas que estreitam mais (`events/new` `max-w-3xl`, `settings` `max-w-2xl`) seguem sem mudança.
- Drawer mobile: `sheetVariants` (`ui/sheet.tsx:33`) tem base `bg-background p-6`; sobrescrever via `className` (`bg-sidebar p-0 text-sidebar-foreground`). O botão de fechar embutido (`:68`) herda `currentColor`.
- Estado ativo: helper `isActive(pathname, href)` = igualdade exata **ou** prefixo `href + "/"`. É obrigatório, não cosmético: não existe `app/(dashboard)/events/[id]/page.tsx`, então `/events` tem que acender em `/events/{id}/attendees`; e o `startsWith` de hoje (`app-shell.tsx:69`) casaria um futuro `/events-arquivados`. Mesmo helper serve às abas de `events/[id]/layout.tsx:56`.
- A11y: `<nav aria-label="Navegação principal">`, `aria-current="page"` no ativo, label em `<span className="sr-only">` + `title` quando recolhido (não há `@radix-ui/react-tooltip` e não vamos adicionar), botão de recolher com `aria-expanded`/`aria-controls`.

---

## 3. Página `/dashboard`

`app/(dashboard)/dashboard/page.tsx`, client component. Não existe **nenhum** endpoint de agregação, e registrations só existem por evento (`/events/{id}/registrations`) — contagem cross-event seria N+1. Dois requests, ambos hooks existentes:

- `useEvents()` — **sem argumentos**, para reusar a chave `{page:1,limit:20}` que `global-template-dialog.tsx:69` e `send-message-form.tsx:72` já preenchem. Passar `(1, 50)` criaria uma quarta chave de cache e um round-trip que não compartilha nada.
- `useAllMessageLogs(1, 10)` — `total` + feed recente.

Widgets:

1. Saudação com nome de `useProfile()` + CTA "Novo evento".
2. Quatro KPI cards: eventos totais, publicados, rascunhos, e **"Mensagens registradas"** — não "enviadas": o `total` de `/messaging/logs` conta todos os status, `failed` incluído (`lib/api/types.ts:180`), e não há filtro de status no hook.
3. Próximos eventos (top 5).
4. Atividade recente: últimos 10 logs, ícone de canal + destinatário + `event.title` + badge reusando `messageLogStatusConfig` (`lib/utils/status-maps.ts:43`). Ordenar por `createdAt` (sempre presente), **não** por `sentAt` (nullable, `:183`).
5. Distribuição por status: barra empilhada em CSS puro (não há lib de chart e não vamos adicionar).

**Regra de honestidade** — `complete = data.length >= total`:

1. Número que vem do `total` do servidor é exato → renderiza puro.
2. Número derivado de filtro client-side só é exato se `complete`.
3. Se `!complete`: renderiza `{n}+` e o sublabel vira `de ${data.length} de ${total} eventos`.
4. Se `!complete`: **nunca** renderizar porcentagem nem a barra empilhada — proporção calculada sobre uma página é mentira sem pista visual. Substituir por link "Ver todos os eventos".
5. "Próximos eventos" só sai se `complete` — uma página posterior pode conter data mais próxima. Se `!complete`, o widget dá lugar ao mesmo link. Quando a API ganhar `?upcoming=true` ou parâmetro de ordenação, o widget volta sem ressalva.

Cuidados: `eventDate` é nullable (`types.ts:46`) — descartar nulos antes de comparar e ordenar. `messageLogStatusConfig` mapeia `sent`→amarelo e `delivered`→cinza, então o feed fica majoritariamente amarelo/cinza; é coerente com o resto do app mas lê como "avisos" num dashboard.

Helpers puros em `lib/utils/dashboard-metrics.ts` (`countByStatus`, `upcomingEvents`) para testar sem provider. **Sem chave de cache nova**: reusar `queryKeys.events(...)` e `queryKeys.allMessageLogs(...)` faz o `useInvalidateGlobal` (`global-messaging.ts:68-74`, invalida `["global"]` e `["events"]`) já refrescar o dashboard. `staleTime: 30_000` (`query-provider.tsx:12`) torna a volta pelo histórico gratuita.

---

## 4. Roteamento

- `app/(public)/login/page.tsx:45,53` — destino padrão `/events` → `/dashboard`.
- `components/layout/app-shell.tsx:52` — logo aponta para `/dashboard`.
- `middleware.ts:26` — matcher ganha `/dashboard/:path*` e `/messages/:path*` (hoje `/messages` só tem guarda client-side no layout).
- `tests/e2e/login.spec.ts:20-23` — atualizar URL/heading pós-login; manter o caso `/events`→`/login` (`:7-9`) e **adicionar** `/dashboard`→`/login`, já que o matcher cresceu.

---

## 5. Testes

Vitest coleta só `tests/unit_test/**/*.spec.{ts,tsx}` e `tests/integration_test/**` (`vitest.config.ts:12-15`) — daí os caminhos abaixo, não o `tests/color-contrast.test.ts` que o CLAUDE.md cita. Não há `@testing-library/user-event`: usar `fireEvent`.

- `tests/unit_test/theme/color-contrast.spec.ts` (`// @vitest-environment node`) — parseia as tripletas de `app/globals.css`, converte no próprio teste e afirma **limiares** (≥4.5 texto, ≥3 non-text, `toBeLessThan(3)` nos pares proibidos), **não** os ratios documentados: accent/bg-dark medido dá ~9.73, o CLAUDE.md diz 9.69 — travar no número exato só gera teste frágil. Incluir round-trip tripleta→hex conferindo o hex do comentário, senão o "hex como fonte de verdade" é decorativo.
- `tests/unit_test/theme/brand-hex.spec.ts` — proíbe `#5ca838`, `#dfe3e1`, `#8b9a9f`, `#51636a`, `#16262b`. Excluir `lib/email/**`, `components/messages/email-layout-editor/**`, `.next/`, `public/` **e o próprio `app/globals.css`** (os `--status-*` são hex cru de propósito em `:38-45` e `:116-123`).
- `tests/unit_test/utils/dashboard-metrics.spec.ts` — helpers puros, incluindo `eventDate: null` e o caso `!complete`.
- `tests/unit_test/layout/sidebar-active.spec.ts` — `isActive`, com `/events` vs `/events-arquivados` e `/events/{id}/attendees`.
- `tests/unit_test/layout/app-sidebar.spec.tsx` — RTL no padrão de `tests/unit_test/forms/edit-event-instance-select.spec.tsx` (`vi.mock("next/navigation")`): recolher esconde label visual mas mantém nome acessível; estado sobrevive a remount.

---

## 6. Ordem de execução

O passo mais arriscado é o retema, porque ~25 call sites em 11 primitivos mudam de aparência de uma vez e não há rede de regressão visual. Vai primeiro, **separando mudança de valor de mudança de nome** — nunca as duas no mesmo commit.

0. **Baseline**: `npx tsc --noEmit`, `npm test`, `npm run build` na branch, para que falha posterior seja atribuível.
1. **Vars de marca, aditivo, sem renomear**: as seis `--color-*` com uma decimal; `--sidebar-*` repontuados nos **dois** blocos; `--background`/`--foreground`/`--primary`/`--primary-foreground`/`--ring` repontuados; `brand`/`brand-ink`/`ink`/`offwhite` no `tailwind.config.ts` + fix da `fontFamily.sans`. A rampa quente fica. Olhar o resultado — é o passo mais barato que expõe toda colisão marca-vs-neutro.
2. **Rebaixar o âmbar**: `tabs.tsx:32`, `input.tsx:11`, `textarea.tsx:10`, `select.tsx:22`, `switch.tsx:14`; criar `--color-accent-ink-hover` para `button.tsx:12`; matar o valor arbitrário de `button.tsx:14`.
3. **Retintar a rampa no lugar**, ainda com nome `--brown-*`: neutros teal-ink, `brown-300` empurrado para ~55-58% L. Zero churn de TypeScript.
4. **Renomear mecanicamente** brown→ink, cream→surface em `globals.css`, `tailwind.config.ts:70-84` e os ~20 hits. Commit puro de find/replace. Bifurcar `button.tsx:18` à mão.
5. **Corrigir as falhas de a11y** levantadas (`badge.tsx:14`, label do botão warn, `table.tsx:53`).
6. **Testes de tema**, agora que os tokens estão finais + corrigir §Cores do `CLAUDE.md` (caminho real, hex do `bg-dark`, nomes reais dos testes).
7. **Sidebar**: `use-sidebar-state.ts` → `sidebar-nav.tsx` → `app-sidebar.tsx` → reescrever `app-shell.tsx`.
8. **Roteamento com a página como stub** (só o heading): middleware, login, logo, e2e.
9. **Widgets**: `lib/utils/dashboard-metrics.ts` + teste, depois a página.

**Follow-ups separados:** (a) os 22 utilitários hardcoded + `warning-banner.tsx`; (b) barra empilhada e "próximos eventos" sem ressalva, quando a API ganhar ordenação; (c) a semântica dupla de `destructive` no botão; (d) `--chart-1..5`, até um chart existir.

## Verificação

```bash
npm run lint
npm test                     # unit — inclui contraste, métricas, sidebar
npx tsc --noEmit
npm run build
npm run dev -- -p 3001       # backend usa 3000
```

Manual, com backend vivo:

1. `/login` → cai em `/dashboard`; conferir no Network que são **2 requests**, não N+1, e que a chave de eventos é compartilhada com `/events`.
2. Recolher/expandir a sidebar; recarregar e conferir persistência; navegar entre `/dashboard`, `/events/{id}/attendees`, `/messages`, `/settings` conferindo o item ativo.
3. Abrir uma página de tabela larga (`/events/{id}/attendees`) e confirmar que a tabela rola dentro da área de conteúdo, sem scroll horizontal no body (regressão do `min-w-0`).
4. <768px → sidebar vira drawer pelo hambúrguer; fechar por overlay e por Esc.
5. Alternar claro/escuro: sidebar continua escura nos dois, sem texto ilegível; anel de foco verde, não laranja.
6. Teclado (Tab/Enter) na sidebar recolhida: cada ícone anuncia seu nome.
7. Com uma conta de >20 eventos, conferir que os KPIs derivados mostram `{n}+` e que a barra empilhada e "próximos eventos" dão lugar ao link.
8. `npm run test:e2e` se as env `E2E_*` estiverem configuradas.
