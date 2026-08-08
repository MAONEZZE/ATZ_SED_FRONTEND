---
name: simplify-code
description: "Use when asked to analyze a whole codebase for complexity, oversized files, duplicated code, or technical debt, and to produce a prioritized refactoring plan. For scanning and reporting across many files - not for applying fixes to a diff (that is /simplify) or reviewing changes for bugs (that is /code-review)."
trigger: /simplify-code
---

# /simplify-code

## Usage

```
/simplify-code                       # escaneia com os limiares padrão (CC 15, 200 linhas)
/simplify-code --max-complexity 10   # limiar de complexidade mais rígido
/simplify-code --max-lines 150       # limiar de tamanho mais rígido
```

## What simplify-code is for

Achar código difícil de manter e propor um plano de refatoração priorizado.
Legibilidade e remoção de duplicação — **nunca** mudança de comportamento.

Duas fases, com uma fronteira dura entre elas:

| Fase | Quem faz | Sai o quê |
|---|---|---|
| 1. Medir | `scan.mjs` (determinístico, AST do TypeScript) | fatos: CC, linhas lógicas, clones |
| 2. Julgar | você, o agente | opinião: problemas, abordagem, esforço, prioridade |

**Você nunca inventa um número.** Toda métrica citada no plano vem do JSON da
fase 1. Se o script não mediu, o plano não afirma.

## What You Must Do When Invoked

Siga na ordem. Não pule etapas.

### Step 1 - Rode o scan

A partir da raiz do projeto alvo:

```bash
node tools/simplify-code/scan.mjs --out "docs/superpowers/refactoring/$(date +%Y-%m-%d)-metrics.json"
```

O script precisa do pacote `typescript` no `node_modules` do projeto alvo.
Se ele falhar por isso, pare e diga ao usuário — não tente estimar na mão.

### Step 2 - Leia o JSON de métricas

Campos: `candidates[]` (com `file`, `logicalLines`, `maxComplexity`,
`totalComplexity`, `reasons`, `hotFunctions`, `testFile`, `testExists`) e
`clones[]` (com `logicalLines` e `occurrences`).

Se `summary.candidates` for 0, diga isso e pare. Um codebase limpo é um
resultado válido; não baixe o limiar para fabricar trabalho.

### Step 3 - Leia os arquivos candidatos

Leia por completo os candidatos do topo (até 8). Para cada um, identifique:

- **Legibilidade** — condicionais aninhadas, nomes crípticos, abstração ausente
- **Duplicação** — trechos repetidos, dentro do arquivo e entre arquivos
- **Concerns misturados** — lógica de form + render + validação no mesmo arquivo

Confira os `clones[]` do JSON contra o que você leu: o script acha só clone
estrutural exato, então duplicação parecida-mas-não-idêntica é achado seu.

### Step 4 - Escreva o plano

Grave em `docs/superpowers/refactoring/YYYY-MM-DD-complexity-analysis.json`:

```json
{
  "metricsFile": "docs/superpowers/refactoring/YYYY-MM-DD-metrics.json",
  "refactorings": [
    {
      "id": "ref-001",
      "file": "components/messages/send-message-form.tsx",
      "metrics": { "maxComplexity": 18, "logicalLines": 632 },
      "issues": ["..."],
      "approach": { "type": "extract-function", "steps": ["..."] },
      "effort": "medium",
      "priority": 1,
      "testFile": "tests/unit_test/messages/send-message.spec.ts",
      "testExists": true,
      "testStrategy": ["..."]
    }
  ],
  "duplications": []
}
```

Regras para preencher:

- `metrics` é **copiado** do JSON da fase 1. Nunca recalculado de cabeça.
- `priority`: 1 é o mais alto. Ordene por (impacto na manutenção) ÷ (risco).
  Arquivo sem teste é risco alto — desça a prioridade dele, não suba.
- `effort`: `low` | `medium` | `high`. Sem estimativa em horas — você não sabe.
- `testExists: false` obriga um passo explícito de "escrever teste de
  caracterização antes de mexer" dentro de `testStrategy`.

### Step 5 - Resuma no terminal

Uma tabela: arquivo, CC, linhas, prioridade, tem teste. Depois o caminho dos
dois JSONs. Diga ao usuário que executar o plano é um passo separado, via
`superpowers:executing-plans`.

## Safety Constraints

- **Sem mudança de fluxo.** Refatoração preserva comportamento observável.
- **Exports intactos.** Assinatura pública não muda.
- **Um commit por refatoração**, para reverter barato.
- **Teste é portão.** Teste vermelho para a execução; não siga no escuro.
- **Este skill não edita código.** Ele só escreve os dois JSONs de relatório.

## Honesty Rules

- Não cite complexidade que não veio do `scan.mjs`.
- Não invente `similarityScore` — o detector acha clone exato, e só.
- `hotFunctions` traz as 5 piores por arquivo, não todas. Não afirme cobertura
  total do arquivo com base nelas.
- Se você leu só 8 dos candidatos, diga quantos ficaram de fora.
- `testExists` é casado por nome de arquivo. Um `true` significa "existe um
  .spec com esse nome", não "esse arquivo está bem coberto".
