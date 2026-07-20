# integration_test

Testes de integração (múltiplos módulos/hooks/API mockada em conjunto).

- Runner: Vitest (`npm run test`), ambiente `jsdom`.
- Padrão de arquivo: `integration_test/**/*.spec.{ts,tsx}` — já incluído no glob do
  `vitest.config.ts`.
- Diferença para `unit_test/`: um teste de unidade isola uma função/componente; um teste
  de integração exercita a colaboração entre camadas (ex.: form + validação + client HTTP
  mockado).

Ainda não há testes de integração; adicione aqui conforme a suíte crescer.
