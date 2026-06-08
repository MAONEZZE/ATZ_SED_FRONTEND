# SED Frontend — Save Event Date

Frontend Next.js da plataforma SED: páginas públicas de evento (SSR/ISR + Open Graph por evento) e dashboard do organizador.

## Stack

- Next.js 14.2 (App Router) + React 18 + TypeScript strict
- Tailwind CSS + shadcn/ui · next-themes (light/dark + glassmorphism) · Inter
- TanStack React Query · React Hook Form + Zod · Sonner
- Auth: Supabase (cookies via `@supabase/ssr`) **isolado atrás de `lib/auth/auth-client.ts`**
- Dados: somente via API NestJS (`lib/api/client.ts`) — nada de Supabase para CRUD
- dnd-kit (form builder) · SSE via fetch-stream (`lib/api/sse.ts`)
- Vitest + Testing Library · Playwright

## Setup

```bash
npm install
cp .env.local.example .env.local   # preencha com seus valores
npm run dev
```

Variáveis:

| Var | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base da API NestJS (ex.: `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (somente auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (somente auth) |
| `REVALIDATE_SECRET` | Segredo do webhook `/api/revalidate` (revalidação ISR) |

> O backend precisa incluir a origem do frontend em `ALLOWED_ORIGINS`.
> Como o backend usa a porta 3000, rode o front em outra porta: `npm run dev -- -p 3001`.

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` · `npm run format`
- `npm test` — unit (Vitest)
- `npm run test:e2e` — Playwright (requer backend vivo + vars `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_PUBLIC_SLUG`, `E2E_EVENT_ID`)

## Arquitetura

- `app/(public)` — index, login, signup e `/e/[slug]` (server component, ISR 300s + revalidação on-demand por tag `event:<slug>` via `POST /api/revalidate`)
- `app/(dashboard)` — eventos (CRUD, capa, cancelar c/ notificação), form builder, inscritos, mensagens (templates + logs SSE ao vivo), automações, landing editor (preview responsivo + chat IA via SSE), admin, settings
- `lib/api/*` — cliente HTTP (Bearer + x-request-id + retry pós-refresh em 401) e hooks React Query por recurso
- `lib/auth/*` — único lugar que importa `@supabase/*` (regra de ESLint força isso)
- `middleware.ts` — protege `/events`, `/settings`, `/admin` (role admin)

## Pendências de backend (UI pronta, aguardando endpoint)

- Envio manual de mensagens (`POST /events/:id/messaging/send`) — botão desabilitado
- Edição de inscrição (`PATCH /events/:id/registrations/:id`) — sheet somente leitura
- Endpoints admin (`/admin/events|users|stats`) — página com empty state
- Credenciais Resend no `PATCH /profile/me` — seção oculta em Settings
- Upload público de imagem (campo `image` do formulário) — campo não renderizado na página pública
