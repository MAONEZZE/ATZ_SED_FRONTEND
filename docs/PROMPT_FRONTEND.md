# SED — Prompt de Desenvolvimento do FRONTEND (Next.js)

> Prompt de referência para construir o frontend da plataforma **SED — Save Event Date**.
> Use este documento como especificação para um agente de código ou como roadmap de implementação.

---

## 0. Contexto do produto

O SED é um SaaS de gestão de eventos curados. O frontend tem **duas superfícies bem distintas**:

1. **Público (SSR/ISR):** as páginas de evento `/e/[slug]` — landing customizada + formulário de inscrição. Precisam de SEO, carregamento rápido e **preview de Open Graph por evento** (capa + título corretos ao compartilhar no WhatsApp/Instagram). É o principal motivo de usar Next aqui.
2. **Dashboard (autenticado):** a área do organizador — eventos, formulários, inscritos, mensagens, automações, landing editor, admin e configurações. Comporta-se como uma aplicação cliente.

---

## 1. Princípios de arquitetura (NÃO NEGOCIÁVEIS)

1. **O frontend só conversa com a API do backend (NestJS).** Não acessa o banco do Supabase diretamente, não usa `@supabase/supabase-js` para CRUD de dados. Todo dado entra e sai pela API do Nest. Isso mantém o front desacoplado do Supabase — quando o backend trocar de banco/provedor, o front não muda.
2. **Único ponto de contato com Supabase = autenticação.** O fluxo de login/sessão usa o SDK de Auth do Supabase, mas isolado atrás de um wrapper (`authClient`) trocável. O token (JWT) obtido é enviado em todas as chamadas à API do Nest. Trocar o provedor de auth no futuro = trocar o wrapper, não a aplicação.
3. **Renderização certa para cada superfície:** páginas públicas de evento em **SSR/ISR** (server components + `generateMetadata` por evento). Dashboard em client components com data fetching via TanStack Query.
4. **Sem lógica de orquestração de mensagem no cliente.** A antiga "fila de automações no cliente" **deixa de existir** — isso agora vive no backend (outbox + BullMQ). O front apenas dispara ações e exibe estado.

---

## 2. Stack

- **Framework:** Next.js 14+ (App Router) + React 18 + TypeScript (strict).
- **UI:** Tailwind CSS + shadcn/ui (Radix), Lucide icons, Framer Motion, `next-themes` (light/dark + glassmorphism).
- **Formulários:** React Hook Form + Zod.
- **Dados:** TanStack React Query (cache, mutations, invalidação) sobre um cliente HTTP próprio.
- **Feedback:** Sonner (toasts).
- **Auth:** SDK Supabase Auth atrás de wrapper `authClient`.
- **Testes:** Vitest + Testing Library + Playwright (e2e).
- **Identidade visual:** brand `#756D45` (light) / `#9D8E6E` (dark); fonte Inter; mobile-first.

---

## 3. Estrutura (App Router)

```
app/
├── (public)/
│   ├── page.tsx                 # Index institucional
│   ├── login/                   # Login
│   ├── signup/                  # Signup
│   └── e/[slug]/                # Página pública do evento (SSR/ISR)
├── (dashboard)/
│   ├── layout.tsx               # DashboardLayout (protegido)
│   ├── events/                  # lista, /new, /[id]/edit, form, attendees, messages, automations, landing
│   ├── admin/
│   └── settings/
├── api/                         # apenas BFF/proxy se necessário (opcional)
lib/
├── api/                         # cliente HTTP + hooks React Query por recurso
├── auth/                        # authClient (wrapper Supabase Auth) + useAuth
└── utils/
components/
├── ui/                          # shadcn/ui
└── ...                          # componentes de domínio
middleware.ts                    # proteção de rotas do dashboard
```

---

## 4. Roadmap de implementação

> Cada fase é entregável e testável. Não avance sem a anterior estável.

### Implementação 1 — Fundação
**Objetivo:** projeto Next de pé com design system e cliente de API.
- Inicializar Next 14 (App Router) + TS strict + ESLint/Prettier + Tailwind. **Projeto novo, do zero** — não reaproveitar o código gerado pelo Lovable.
- **Remover qualquer artefato do Lovable:** meta tags (`meta-author: Lovable`, `meta-description: Lovable Generated Project`, `twitter:site: @Lovable`), a imagem OG genérica hospedada em `*.lovable.app`/R2, scripts e branding do Lovable. Substituir por metadados próprios do SED (definidos em `app/layout.tsx` e por `generateMetadata` nas páginas de evento).
- Instalar e configurar shadcn/ui, `next-themes`, tema glassmorphism, cores brand, fonte Inter.
- **Cliente HTTP** (`lib/api/client.ts`): base URL da API Nest, injeção automática do token de auth, tratamento de erros e refresh.
- Provider do TanStack Query + Sonner no root layout.
- Variáveis de ambiente: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Entregável:** app sobe sem nenhum vestígio do Lovable, tema light/dark funciona, cliente de API pronto para consumir o backend.

### Implementação 2 — Autenticação
**Objetivo:** login/sessão isolados e proteção de rotas.
- `authClient` (wrapper do Supabase Auth): `signIn`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`, auto-refresh. **Todo o resto do app ignora que é Supabase.**
- Páginas `/login` e `/signup` (signup: nome, e-mail, senha ≥ 6; e-mail de confirmação).
- Hook `useAuth()` + contexto de sessão.
- `middleware.ts`: protege o grupo `(dashboard)`, redireciona para `/login` se não autenticado.
- Spinner de loading durante verificação de sessão.
- **Entregável:** login/logout funcionando; rotas do dashboard protegidas; token propagado para a API.

### Implementação 3 — Páginas públicas do evento (SSR/ISR) ⭐
**Objetivo:** a maior vitória do Next — landing por evento com SEO e OG corretos.
- Rota `app/(public)/e/[slug]/page.tsx` como **server component** que busca o evento + landing + form fields da API.
- `generateMetadata({ params })`: título, descrição e **`og:image` = capa do evento** (preview social correto por evento).
- Renderizar as seções da landing (hero, about, speakers, faq, gallery, video, testimonials, countdown, schedule, registration) conforme ativadas/ordenadas, aplicando o tema (cores, fonte, CSS custom).
- **Formulário de inscrição** (client component): valida pelos `form_fields`, faz upload de imagens, `POST` para a API pública; tela de sucesso customizável.
- Se o evento tiver `external_url`, redirecionar.
- ISR com revalidação (a landing muda pouco; revalidar sob demanda quando o organizador edita).
- **Entregável:** `/e/[slug]` renderiza no servidor, compartilha com card correto, e recebe inscrições.

### Implementação 4 — Dashboard: eventos
**Objetivo:** gestão de eventos do organizador.
- `EventLayout` com abas horizontais (scroll em mobile) + breadcrumbs.
- Lista de eventos (`/events`): duplicar, copiar link, excluir, status badges.
- Criar evento (`/events/new`): rascunho ou publicar direto.
- Editar (`/events/[id]/edit`): detalhes + upload de capa + cancelar evento (dialog com toggle "notificar participantes", padrão ligado). Evento cancelado → formulário readonly.
- **Dirty check:** botão "Salvar" só ativa com mudanças (comparação com estado salvo).
- **Entregável:** CRUD completo de eventos com UX de salvar/cancelar/duplicar.

### Implementação 5 — Form builder
**Objetivo:** editor de formulário com drag & drop.
- `/events/[id]/form`: lista de campos reordenável (drag & drop).
- Tipos: text, textarea, email, phone, radio, checkbox, boolean, instagram, image.
- Campos fixos (nome, email, phone, address) com ícone de cadeado, não removíveis.
- **Entregável:** organizador monta e reordena o formulário; campos fixos protegidos.

### Implementação 6 — Inscritos (Attendees)
**Objetivo:** gestão do funil de inscritos.
- `/events/[id]/attendees`: tabela (vira sheet em mobile) com **busca e filtros em tempo real** (sem submit).
- Mudança de status (dispara automação no backend), edição de inscrição.
- Status badges: approved=verde, rejected=vermelho, pending=amarelo, waitlist=azul, screening=roxo.
- **Entregável:** filtrar, buscar, mudar status e editar inscritos com feedback imediato.

### Implementação 7 — Mensagens e templates
**Objetivo:** templates + envio manual + histórico.
- `/events/[id]/messages`: editor de `message_templates` por canal (whatsapp/email) e trigger, com inserção de variáveis (`{{nome}}`, `{{evento}}`...).
- Envio manual: seleciona inscritos + template + canal → chama a API (que enfileira na outbox). **O front não controla timing nem fila** — só dispara e mostra status.
- Histórico de `message_logs` em tempo real via **SSE do backend** (não Realtime do Supabase).
- **Entregável:** criar templates, enviar manualmente e acompanhar logs ao vivo.

### Implementação 8 — Automações
**Objetivo:** configurar automações por trigger.
- `/events/[id]/automations`: por trigger (`on_registration`, `on_screening`, `on_qualification`, `on_approval`, `on_rejection`, `on_waitlist`, `after_approval`, `before_event`, `after_event`), escolher canal + template + `delay_minutes` (para before/after_event).
- **Entregável:** organizador liga/desliga e configura automações; backend executa.

### Implementação 9 — Landing editor + chat IA (SSE)
**Objetivo:** editor visual da landing com IA.
- `/events/[id]/landing`: layout split — editores de seção à esquerda, **preview responsivo** (desktop/tablet/mobile) ao centro, **chat IA** à direita.
- Chat consome o endpoint **SSE** do backend (`/ai/landing-chat`), exibindo a resposta em streaming; aplica mudanças (reordenar/ativar seções, cores, conteúdo) no preview ao vivo.
- Tema configurável: cores, fonte, CSS custom.
- Botão de gerar estilo de e-mail (consome `/ai/email-style`).
- **Entregável:** editar a landing visualmente e via chat IA com preview em tempo real.

### Implementação 10 — Admin e configurações
**Objetivo:** painel admin e credenciais do organizador.
- `/admin` (apenas role admin): eventos, usuários, estatísticas.
- `/settings`: credenciais Evolution (`base_url`, `instance`, `token`) e Resend (`api_key`, `from_email`, `from_name`), com **toggle de visibilidade (olho)**. Salvos via API no `profile`.
- **Entregável:** admin enxerga o sistema; organizador configura suas credenciais.

### Implementação 11 — Polimento e qualidade
**Objetivo:** acabamento de produção.
- Loading states (spinners em rotas protegidas, botões, carregamentos), toasts para toda ação (com variant destructive em erros).
- Responsividade mobile-first completa (tabelas → sheets, abas com scroll).
- Acessibilidade (foco, labels, contraste), estados vazios e de erro.
- Testes: Vitest (componentes/hooks) + Playwright (fluxos: inscrição pública, login, mudança de status).
- **Entregável:** experiência polida e coberta por testes nos fluxos críticos.

### Implementação 12 — Deploy
- Variáveis de ambiente por ambiente; revalidação on-demand das páginas de evento quando o organizador edita.
- **Entregável:** front em produção; páginas públicas com SSR/OG corretos; dashboard consumindo a API.

---

## 5. Observações sobre o desacoplamento

O frontend depende apenas de duas coisas externas: a **API do Nest** (todo o dado) e o **wrapper de auth** (único contato com Supabase). Se o backend trocar de banco/provedor, o front não muda. Se o provedor de auth mudar, troca-se só o `authClient`. Mantenha essa disciplina — nenhum componente deve importar `@supabase/supabase-js` diretamente fora do wrapper de auth.
