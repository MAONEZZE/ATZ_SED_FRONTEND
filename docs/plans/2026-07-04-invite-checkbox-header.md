# Checkbox de convite no header da mensagem (envio + template)

## Context

Sequência de `2026-07-04-remove-manual-invite-config.md` (commit `5cb1405`). Hoje o convite
(`.ics`) é 100% orientado pelo evento; o que dispara o anexo é a presença do token
`{{invite}}` / `{{invite_recorrente}}` no corpo (backend troca por markers `[[[ICS_INVITE]]]`
— worker gera o `.ics` a partir dos dados do evento). Atualmente o usuário insere o token
**à mão** pelo menu "Variáveis".

Problema: inserir token de texto é pouco óbvio. Usuário quer, tanto no **modal de template**
quanto na **página de disparo manual**, um **checkbox** no lado direito do header do campo de
mensagem (a barra com o dropdown de variáveis + botão de anexo) que sinaliza "mandar o convite
do evento junto do e-mail". A configuração do convite (data/fim/recorrência) já vive nas
configurações do evento — nenhuma mudança lá.

Resultado: checkbox substitui a inserção manual do token. Frontend-only — **sem novo campo de
backend**; o checkbox apenas injeta/remove o token no corpo, que já é o gatilho do backend.

## Abordagem

Checkbox "Enviar convite do evento", só em `channel === "email"`, no grupo direito do header.
- **Marcado** → injeta o token no corpo. **Desmarcado** → remove.
- Estado derivado de `hasInviteToken(body)` (sem novo campo de state/draft/payload).
- Remover `{{invite}}` / `{{invite_recorrente}}` do menu de variáveis (checkbox é a única via).

**Decisão (default, usuário ausente — confirmar):** um único checkbox injeta **sempre**
`{{invite}}`. Recorrência resolvida backend-side pelos dados do evento. Se o convite recorrente
precisar do token `{{invite_recorrente}}` explicitamente, vira follow-up.

## Mudanças

### 1. Restaurar helpers de token — `lib/validation/send-message.ts`
Reintroduzir (foram removidos em `5cb1405`), versões mínimas:
```ts
export const INVITE_TOKEN = "{{invite}}";
export function injectInviteToken(body, token) { /* insere antes de </body> ou no fim */ }
export function removeInviteToken(body, token) { /* remove todas as ocorrências */ }
export function hasInviteToken(body, token)   { return body.includes(token); }
```
(lógica idêntica à versão pré-`5cb1405`). **Não** mexer em `SendMessageDraft` nem em
`toSendMessageInput` — o corpo já carrega o token e já é enviado.

### 2. Página de disparo manual — `components/messages/send-message/message-body-editor.tsx`
- Header/toolbar em L60; grupo direito hoje = botão "Editar layout" (`ml-auto`, L104-117).
- Envolver o grupo direito num `<div className="ml-auto flex items-center gap-2">` (tirar
  `ml-auto` do botão). Adicionar `Checkbox` (`components/ui/checkbox.tsx`) + `Label`
  "Enviar convite do evento", só quando `channel === "email"`.
- Handler: `onBodyChange(checked ? injectInviteToken(body, INVITE_TOKEN) : removeInviteToken(...))`.
  `checked = hasInviteToken(body, INVITE_TOKEN)`. Usa props `body`/`onBodyChange` que já existem
  (L41-42) — **sem props novas**.

### 3. Modal de template — `components/messages/global-template-dialog.tsx`
- Header/toolbar em L236; grupo direito hoje = "Editar layout" (`ml-auto`, L276).
- Mesmo checkbox no grupo direito, só email. Toggla `body` via `setBody` do `useEmailComposer`
  (padrão idêntico ao antigo `toggleInvite`, ver `git show 5cb1405^:...global-template-dialog.tsx`).
- Token já persiste no `body` do template — **sem novo campo** em `TemplateInput`/`MessageTemplate`.

### 4. Remover tokens do menu de variáveis
- `components/messages/template-variables-info.tsx` — tirar `invite` e `invite_recorrente` de
  `VARIABLE_DESCRIPTIONS` (L16-20).
- `lib/api/templates.ts` — tirar `"invite"` / `"invite_recorrente"` de `TEMPLATE_VARIABLES`
  (L31-32).

### 5. Configurações do evento
Recorrência já está no form (`components/events/event-form-fields.tsx:140+`). Ajustar só o
texto explicativo (L144-146) que cita `{{invite_recorrente}}` — trocar por menção ao checkbox
"Enviar convite" da mensagem.

## Arquivos-chave
- `lib/validation/send-message.ts` (helpers de token)
- `components/messages/send-message/message-body-editor.tsx` (checkbox — disparo)
- `components/messages/global-template-dialog.tsx` (checkbox — template)
- `components/messages/template-variables-info.tsx`, `lib/api/templates.ts` (remover tokens)
- `components/events/event-form-fields.tsx` (texto)

## Verificação
1. `npx tsc --noEmit` limpo.
2. `npm run test` verde.
3. Manual (`npm run dev`):
   - Disparo (`/messages`, email): checkbox à direita do header (ao lado de Anexo/Editar
     layout); marcar → `{{invite}}` no corpo → `POST /messages` com token → `.ics` anexado
     (checar Network); em whatsapp o checkbox some.
   - Template (email): marcar/desmarcar togla o token; salva e reabre no estado certo.
   - Menu "Variáveis" não lista mais `{{invite}}` / `{{invite_recorrente}}`.
   - Página do evento: painel de recorrência intacto.
