# REFACTOR_PLAN

Plano completo de refatoração e limpeza profunda em
[`docs/plans/2026-07-01-refat-front.md`](docs/plans/2026-07-01-refat-front.md).

Branch: `feat/limpeza_profunda`.

## Resumo
Arquitetura base já boa (Next.js 14 App Router, camada de dados via hooks React Query em
`lib/api/*`, tokens Tailwind). Foco: uniformização, não reescrita.

- **2A** Fundações compartilhadas — constantes/hooks do composer de email, tokens de status.
- **2B** Adoção do `useEmailComposer` (dialog → send-form).
- **2C** Quebra do monólito `send-message-form.tsx` (1085 linhas) em componentes focados.
- **2D** Polimorfismo/composição: registry por tipo de campo, `<StatusBadge>` genérico,
  mapa de estratégia de presets.
- **2E** Migração de cores ad-hoc para tokens semânticos (zero mudança visual).
- **2F** Reorganização de testes → `unit_test/<area>/*.spec`.
- **Fase 3** Limpeza de código morto + audit de dependências.

Cada passo termina com build + tsc + testes verdes.
