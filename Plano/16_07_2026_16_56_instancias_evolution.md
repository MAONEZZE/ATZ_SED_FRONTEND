# Instâncias Evolution + Auto-login + Persistência de Formulários

**Criado:** 16/07/2026 16:56
**Objetivo:** Refletir no frontend a mudança de instâncias Evolution do backend (dropdown no evento e no envio, remoção do perfil), habilitar login automático persistente e persistir os formulários públicos (autosave + flag "já enviado").
**Branch:** feature/ajustes_task_868kbqcfx (atual — NÃO criar branch/worktree novo)

## Contexto

Backend mudou o modelo de instâncias Evolution:
- `evolutionInstance` (string livre) saiu do Profile e do evento; virou `evolutionInstanceId` (UUID) no evento, referenciando `evolution_instances`.
- POST /messages ganhou `instanceId` opcional (UUID); regra: precisa de `eventId` OU `instanceId` (400 se faltarem ambos).
- Novo `GET /evolution-instances` (JWT) → `[{id, nickname}]`, 7 fixas, ordenadas por nickname. Fonte dos dropdowns.

**Decisões do usuário:** persistência nos **3 forms** públicos; `instanceId` **enviado ao backend**; remover `evolutionInstance` do perfil e **desabilitar** o botão "Grupos" do WhatsApp.

**Regras:** mexer só no pedido; **não alterar a mecânica de disparo** (só acrescentar o campo `instanceId` ao payload); sem branch/worktree novo.

Arquivos-chave: `lib/api/{types,events,profile,query-keys}.ts`, novo `lib/api/evolution-instances.ts`, `lib/validation/{event-schema,send-message}.ts`, `components/events/event-form-fields.tsx`, `app/(dashboard)/events/[id]/edit/page.tsx`, `components/messages/send-message-form.tsx`, `components/messages/send-message/{send-summary-rail,whatsapp-groups-popover}.tsx`, `lib/messages/composer-constants.ts`, `app/(dashboard)/settings/page.tsx`, `app/(public)/login/page.tsx`, `app/(public)/e/[slug]/{registration-form.tsx,pos-evento/page.tsx,nps/page.tsx}`, novo `lib/utils/local-draft.ts`.

## Tarefas

### Camada de dados
- [x] 1. Novo hook `useEvolutionInstances()` em `lib/api/evolution-instances.ts` (GET `/evolution-instances`, mirror do `useProfile`); tipo `EvolutionInstance { id; nickname }` em `lib/api/types.ts`; chave `evolutionInstances` em `lib/api/query-keys.ts`. — _done quando:_ hook compila e retorna a lista.
- [x] 2. Renomear `evolutionInstance`→`evolutionInstanceId` em `EventObject` (`types.ts:54`) e `EventUpdateInput` (`events.ts:28`); incluir `evolutionInstanceId?` em `EventInput` (`events.ts`). — _done quando:_ tipos batem com o backend.
- [x] 3. Remover `evolutionInstance` de `Profile` (`types.ts:192`) e `ProfileUpdateInput` (`profile.ts:10`); ajustar `useWhatsAppGroups` p/ não depender de `profile.evolutionInstance` (fica sem instância → query desabilitada). — _done quando:_ nenhuma referência a `profile.evolutionInstance` resta.

### Task 1 — Instância no form de evento
- [x] 4. Schema: `evolutionInstanceId: z.string().optional()` em `eventSchema` e mapear em `toEventInput` (`lib/validation/event-schema.ts`). — _done quando:_ valor chega no payload.
- [x] 5. Select "Instância" em `components/events/event-form-fields.tsx` (Controller, mirror do bloco `recurrenceFreq:141-165`, opções de `useEvolutionInstances`). — _done quando:_ dropdown lista os apelidos.
- [x] 6. `toFormValues` da edição (`app/(dashboard)/events/[id]/edit/page.tsx:29-45`) mapeia `evolutionInstanceId: event.evolutionInstanceId ?? ""`; default no create. — _done quando:_ editar evento pré-seleciona a instância salva.

### Task 2 — Instância no envio de mensagem (com "Sem instância")
- [x] 7. Sentinela `NO_INSTANCE` em `lib/messages/composer-constants.ts`. — _done quando:_ constante existe.
- [x] 8. Estado `instanceId` + Select "Instância" (com item "Sem instância") no card `1 · Configuração` de `components/messages/send-message-form.tsx` (mirror do Select de Evento). — _done quando:_ dropdown aparece com opção "Sem instância".
- [x] 9. Payload: `instanceId?` em `SendMessageInput` (`types.ts:236-245`), `SendMessageDraft` e `toSendMessageInput`/`validateSendMessage` (`lib/validation/send-message.ts`) com regra eventId OU instanceId. **Só acrescenta o campo — não mexe na mecânica de `useSendMessage`/`onSend`.** — _done quando:_ envio sem evento manda `instanceId`.
- [x] 10. Card "Resumo do envio": prop `instanceLabel?` + `<SummaryRow label="Instância">` em `components/messages/send-message/send-summary-rail.tsx`, alimentada pelo nickname selecionado. — _done quando:_ instância selecionada aparece no resumo.

### Task Q3 — Perfil / popover WhatsApp
- [x] 11. Remover campo "Instância" do `app/(dashboard)/settings/page.tsx` (input + campo do form + payload). — _done quando:_ settings não mostra mais "Instância".
- [x] 12. Desabilitar o botão "Grupos" (PopoverTrigger) em `components/messages/send-message/whatsapp-groups-popover.tsx`; `send-message-form.tsx:479` para de passar `profile?.evolutionInstance`. — _done quando:_ botão "Grupos" fica `disabled`.

### Task 3 — Login automático persistente
- [x] 13. Em `app/(public)/login/page.tsx`, redirecionar usuário já autenticado (sessão válida via `useAuth()`) para `next`/`/events` no mount. Sessão já persiste em cookie (`@supabase/ssr`, autoRefresh on) — o gap é a página de login não reencaminhar quem já tem token. — _done quando:_ voltar ao site com token válido cai direto no dashboard sem relogar.

### Tasks 4 & 5 — Persistência dos 3 forms públicos
- [x] 14. Helper mínimo `lib/utils/local-draft.ts` (get/set/remove de draft + flag "submitted"), try/catch seguro. — _done quando:_ helper reutilizável existe.
- [x] 15. `app/(public)/e/[slug]/registration-form.tsx`: já tem autosave (`reg_draft_${slug}`); adicionar flag `reg_submitted_${slug}` — init `success` da flag + grava no submit. — _done quando:_ reload após enviar mostra a tela de sucesso.
- [x] 16. `app/(public)/e/[slug]/pos-evento/page.tsx`: autosave (`posevent_draft`) + restore no mount + limpar no sucesso + flag `posevent_submitted` (init `done`). — _done quando:_ campos persistem e reload pós-envio mostra "Respostas enviadas!".
- [x] 17. `app/(public)/e/[slug]/nps/page.tsx`: mesmo padrão (`nps_draft`/`nps_submitted`). — _done quando:_ campos persistem e reload pós-envio mostra "Avaliação enviada!".

### Verificação e docs
- [x] 18. `npm run build` / typecheck + rodar `unit_test/` (Vitest). Verificar manualmente: criar/editar evento com instância; envio sem evento com instância no resumo; relogin automático; sair e voltar nos 3 forms. — _done quando:_ build verde, testes verdes, fluxos manuais OK.
- [x] 19. Atualizar notas Obsidian (`~/Documents/SED/ATZ_SED_FRONTEND/`): `Contrato de API Backend.md`, `Fluxo - Eventos e Funil.md`, `Fluxo - Envio de Mensagem.md`, `Fluxo - Inscrição Pública.md`, `Fluxo - Autenticação.md`, `Camada de Dados.md`, `Pendências de Backend.md`. — _done quando:_ notas refletem instância/persistência/auto-login.

## Verificação end-to-end
- Backend rodando na 3000; frontend `npm run dev -- -p 3001`.
- Evento: criar/editar → Select "Instância" lista apelidos → salvar → PATCH manda `evolutionInstanceId` (UUID válido, sem 400).
- Mensagem: sem evento + instância selecionada → resumo mostra a instância → POST manda `instanceId`; sem evento e sem instância → bloqueio no `validateSendMessage`.
- Auth: logar, fechar aba, reabrir `/` ou `/login` → cai no dashboard sem formulário.
- Forms públicos (inscrição/pós-evento/NPS): preencher parcialmente, sair, voltar → campos restaurados; enviar, recarregar → tela de sucesso direto.

## Notas de progresso

Todas as 19 tarefas concluídas. `npx tsc --noEmit` limpo, `npm run build` verde (só 2 warnings pré-existentes de `exhaustive-deps` iguais ao padrão já usado em `registration-form.tsx`), `npx vitest run` 105/105 (4 testes de `send-message.spec.ts` ajustados pra nova assinatura `validateSendMessage(draft, opts)` + 2 novos casos cobrindo a regra eventId/instanceId).

Verificação manual completa (click-through com backend rodando) **não foi feita** — ambiente sem browser interativo. Fiz smoke test: subi o frontend sozinho (sem backend) e confirmei via `curl` que `/login`, `/e/{slug}/pos-evento` e `/e/{slug}/nps` respondem 200 sem crash (valida que os `try/catch` de `localStorage` em SSR não quebram as rotas). Falta o usuário validar interativamente com os dois servidores no ar: criar/editar evento com instância, envio sem evento, auto-relogin, e os 3 forms públicos com draft/flag.

Detalhe de implementação: `EventUpdateInput` virou `type EventUpdateInput = Partial<EventInput>` (era uma interface duplicando o campo que o plano pedia — simplifiquei pra não ter o mesmo campo declarado duas vezes).
