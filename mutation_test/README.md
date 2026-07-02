# mutation_test

Testes de mutação (mutation testing) — medem a qualidade da suíte introduzindo mutações
no código e verificando se algum teste falha.

Nenhuma ferramenta de mutação está instalada ainda (sem dependência nova nesta refatoração).
Para habilitar, a opção recomendada para esta stack (Vitest) é o **Stryker**:

```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init
```

Configurar o `stryker.config.json` para usar o `vitest` runner e apontar `mutate` para
`lib/**/*.ts` (lógica pura — melhor custo/benefício). Os relatórios/config ficam neste
diretório.
