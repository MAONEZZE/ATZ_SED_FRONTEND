# Remover config manual de invite de mensagens/templates (invite fica orientado pelo evento)

## Context

Hoje o invite (.ics) pode ser configurado manualmente em dois lugares errados:
1. **Fluxo de envio** (`send-message-form`): um modal (`InviteConfigModal`) deixa o usuário escolher data/hora/timezone/recorrência arbitrários, que viram um payload `invite` no POST — sobrescrevendo os dados do evento.
2. **Editor de template** (`global-template-dialog`): um dropdown "Invite" com 2 checkboxes que injeta/remove os tokens `{{invite}}` / `{{invite_recorrente}}` no corpo.

O certo é a configuração do invite (data/fim/recorrência) viver **só na página do evento** — que já tem esses campos (`eventDate`, `endDate`, `recurrenceFreq/Interval/Until`, painel "Recorrência" em `components/events/event-form-fields.tsx`).

**Confirmado no backend** (`feat/limpeza_profunda`): o payload `invite` é override **opcional**; sem ele o worker (`message-dispatch.worker.ts:185-264`, branch fallback `:243-261`) gera o .ics a partir dos dados do evento. O que dispara o anexo é o token `{{invite}}`/`{{invite_recorrente}}` no corpo (via markers `[[[ICS_INVITE]]]`). Automações já funcionam assim (só token, sem payload). **Então:** remover o payload manual é seguro; **o token precisa continuar chegando no corpo**.

**Decisão (Q1 — padrão recomendado):** manter `{{invite}}`/`{{invite_recorrente}}` como **variáveis de template** normais — continuam no menu "Variáveis" (`VARIABLE_DESCRIPTIONS`) e em `TEMPLATE_VARIABLES`, inseríveis manualmente no template ou no envio avulso. Invite segue funcionando, 100% orientado pelo evento. Remove-se só o modal de config manual e o dropdown dedicado de toggle.

**Sequenciamento (Q2 — padrão recomendado):** o dir principal (`feat/limpeza_profunda`) tem WIP staged (feature de anexos) tocando arquivos que se sobrepõem. Commitar o WIP de anexos primeiro, depois fazer esta remoção como commit separado e limpo.

## Escopo — o que remover vs manter

**Remover:** modal de config manual de invite no envio; dropdown de toggle de invite no editor de template; toolbar button "Invite" no editor de mensagem; resumo de invite no rail; payload `invite` no request; tipos/helpers/arquivos que ficam órfãos.

**Manter:** tokens `{{invite}}`/`{{invite_recorrente}}` como variáveis documentadas e inseríveis; painel de recorrência na página do evento (nenhuma mudança lá).

## Passos

### 0. (pré) Commitar WIP de anexos
Working tree tem mudanças staged de anexos. Commitar primeiro (ex.: `feat(messages): file attachments on send`) para isolar. Se o WIP não estiver pronto, alternativa: fazer esta remoção em branch/worktree separado.

### 1. Deletar arquivos órfãos
- `components/messages/invite-config-modal.tsx` — apagar inteiro (só usado pelo fluxo removido).
- `lib/messages/invite-config.ts` — apagar inteiro (todos consumidores — `send-message.ts`, `invite-config-modal.tsx`, `send-summary-rail.tsx`, `send-message-form.tsx` — são editados/removidos aqui).

### 2. `components/messages/send-message-form.tsx`
- Remover imports: `INVITE_TOKEN`, `INVITE_RECURRENT_TOKEN`, `removeInviteToken` (13-15); `InviteConfig`, `isRecurrentInvite` (30); `InviteConfigModal` (32).
- Remover state `inviteIcs`/`inviteRecurrent`/`inviteConfig`/`inviteModalOpen` (136-139).
- Remover função `saveInvite` (154-169).
- Remover resets de invite em `changeChannel` (209-211) e no reset pós-envio (~329-331).
- Remover campos invite do objeto `draft` (221-223).
- Remover props `hasInvite` (486) e `onOpenInvite` (493) passadas ao body editor.
- Remover props `inviteConfig` (587) e `onEditInvite` (588) passadas ao rail.
- Remover render `<InviteConfigModal>` (604-609).

### 3. `components/messages/send-message/message-body-editor.tsx`
- Remover `Ticket` do import de `lucide-react` (4).
- Remover props `hasInvite` e `onOpenInvite` (assinatura 34/39/51/56).
- Remover o botão de toolbar "Invite" (108-122).

### 4. `components/messages/send-message/send-summary-rail.tsx`
- Remover import `InviteConfig`/`describeInvite` (5).
- Remover props `inviteConfig`/`onEditInvite` (27-28, 40-41).
- Remover a linha de resumo "Invite" (67-73).

### 5. `lib/validation/send-message.ts`
- Remover import `toInvitePayload`/`InviteConfig` (7).
- Remover campos `inviteIcs`/`inviteRecurrent`/`inviteConfig` de `SendMessageDraft` (17-23) — manter `attachments`.
- Remover constantes `INVITE_TOKEN`/`INVITE_RECURRENT_TOKEN` (54-55) e helpers `injectInviteToken`/`removeInviteToken`/`hasInviteToken` (57-72) — ficam sem consumidor após passos 2 e 6.
- Em `toSendMessageInput`: remover bloco de injeção de token (80-85) e o campo `invite:` do retorno (104-107).

### 6. `components/messages/global-template-dialog.tsx`
- Remover `Ticket` do import (6) e o import dos helpers de invite (8-12).
- Remover derivação `inviteIcs`/`inviteRecurrent`/`inviteActive` (118-120).
- Remover função `toggleInvite` (122-129).
- Remover o dropdown "Invite" da toolbar (296-332).

### 7. `lib/api/types.ts`
- Remover interfaces `InviteRecurrencePayload` (276-280) e `InvitePayload` (282-294).
- Remover campo `invite?: InvitePayload;` de `SendMessageInput` (305).

### 8. Manter variáveis (nenhuma mudança de código, confirmar)
- `components/messages/template-variables-info.tsx` `VARIABLE_DESCRIPTIONS` — manter entradas `invite`/`invite_recorrente` (16-20). Opcional: ajustar descrições p/ deixar claro que derivam do evento.
- `lib/api/templates.ts` `TEMPLATE_VARIABLES` — manter `"invite"`/`"invite_recorrente"` (31-32).

### 9. `unit_test/validation/send-message.spec.ts`
- Remover os testes de invite (linhas 115-283: "email com invite…", "inviteConfig…", injeção de token, whatsapp-ignora-invite). Manter `recipientCount`, `validateSendMessage`, `validateManualRecipient` e os 3 primeiros testes de `toSendMessageInput` (71-113, que não tocam invite).

## Arquivos afetados (resumo)
Deletar: `components/messages/invite-config-modal.tsx`, `lib/messages/invite-config.ts`.
Editar: `components/messages/send-message-form.tsx`, `components/messages/send-message/message-body-editor.tsx`, `components/messages/send-message/send-summary-rail.tsx`, `lib/validation/send-message.ts`, `components/messages/global-template-dialog.tsx`, `lib/api/types.ts`, `unit_test/validation/send-message.spec.ts`.
Manter intactos: página/form do evento, `template-variables-info.tsx`, `lib/api/templates.ts`.

## Verificação
1. `npx tsc --noEmit` — limpo (pega qualquer import/tipo órfão esquecido).
2. `npm run test` — verde (spec de send-message ajustado).
3. `npm run build` (com env dummy, como nas tasks anteriores) — compila.
4. Manual (`npm run dev`):
   - Página de mensagens (`/messages`): editor de e-mail NÃO tem mais botão "Invite" nem modal; rail não mostra linha de invite; menu "Variáveis" ainda lista `{{invite}}`/`{{invite_recorrente}}`.
   - Editor de template: NÃO tem mais dropdown "Invite"; token ainda inserível via menu de variáveis.
   - Página do evento: painel de recorrência intacto.
   - Ponta-a-ponta (opcional): criar template de e-mail com `{{invite}}` inserido via menu de variáveis, disparar para um evento com `eventDate` definido → confirmar que o .ics (`evento.ics`) é anexado, derivado dos dados do evento.
