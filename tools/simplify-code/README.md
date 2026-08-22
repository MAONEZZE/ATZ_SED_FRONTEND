## O que faz
Escaneia o codebase inteiro medindo complexidade ciclomática, linhas lógicas e código duplicado via AST do TypeScript. Depois lê os piores arquivos e escreve um plano de refatoração priorizado. Mede primeiro, opina depois — nenhum número do relatório é chutado.

## Quando usar
- O codebase acumulou arquivos grandes e difíceis de mexer
- Você suspeita de copy-paste mas não sabe onde
- Antes de um ciclo de refatoração, pra decidir por onde começar
- Quer uma linha de base de complexidade pra acompanhar no tempo

## Quando NÃO usar
- Quer corrigir o diff atual → use `/simplify`
- Quer achar bugs numa mudança → use `/code-review`
- O projeto não tem `typescript` no node_modules → o scan não roda
- Quer que alguém aplique as refatorações → isto só gera o plano

## Exemplo
`/simplify-code` → scan mede 118 arquivos → 6 candidatos acima do limiar → agente lê os 6 → escreve `docs/superpowers/refactoring/2026-08-07-complexity-analysis.json` com 6 refatorações priorizadas e 2 duplicações → você executa com `superpowers:executing-plans`

## Requisitos
Node 18+ e o pacote `typescript` instalado no projeto alvo (o scan usa o compilador dele). Wrappers shadcn/ui em `components/ui/` e arquivos de teste ficam fora do escopo por padrão.
