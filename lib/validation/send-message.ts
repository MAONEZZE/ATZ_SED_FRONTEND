import type {
  ManualRecipient,
  MessageChannel,
  SendMessageInput,
} from "@/lib/api/types";

/** Rascunho do envio manual (estado do formulário) */
export interface SendMessageDraft {
  channel: MessageChannel;
  templateId: string | null;
  subject: string;
  body: string;
  registrationIds: string[];
  manualRecipients: ManualRecipient[];
  /** Anexa convite de agenda (.ics) — só e-mail com evento vinculado. */
  inviteIcs?: boolean;
  /** Anexa convite de agenda recorrente (.ics). */
  inviteRecurrent?: boolean;
}

export function recipientCount(draft: Pick<SendMessageDraft, "registrationIds" | "manualRecipients">): number {
  return draft.registrationIds.length + draft.manualRecipients.length;
}

export const WHATSAPP_RECIPIENT_LIMIT = 30;

/** Retorna mensagem de erro ou null se o rascunho é enviável */
export function validateSendMessage(
  draft: SendMessageDraft,
): string | null {
  if (recipientCount(draft) === 0) return "Selecione ao menos um destinatário";
  if (draft.channel === "whatsapp" && recipientCount(draft) > WHATSAPP_RECIPIENT_LIMIT)
    return `WhatsApp: máximo ${WHATSAPP_RECIPIENT_LIMIT} destinatários por disparo`;
  if (!draft.templateId && !draft.body.trim())
    return "Escreva a mensagem ou selecione um template";
  return null;
}

/** Valida destinatário avulso antes de adicionar à lista */
export function validateManualRecipient(
  recipient: ManualRecipient,
  channel: MessageChannel,
): string | null {
  if (!recipient.name.trim()) return "Nome é obrigatório";
  if (channel === "email" && !recipient.email?.trim())
    return "E-mail é obrigatório para envio por e-mail";
  if (channel === "whatsapp" && !recipient.phone?.trim())
    return "Telefone é obrigatório para envio por WhatsApp";
  return null;
}

/**
 * Insere um token de convite no corpo. Em HTML (body completo), coloca o token
 * ANTES de </body> — fora disso o token cairia depois de </html> e seria
 * descartado por clientes/parsers de e-mail, impedindo o backend de detectá-lo.
 */
function injectInviteToken(body: string, token: string): string {
  if (body.includes(token)) return body;
  const closeIdx = body.toLowerCase().lastIndexOf("</body>");
  if (closeIdx !== -1) {
    return `${body.slice(0, closeIdx)}${token}\n${body.slice(closeIdx)}`;
  }
  return `${body}\n${token}`;
}

export function toSendMessageInput(
  draft: SendMessageDraft,
  opts: { hasEventId: boolean },
): SendMessageInput {
  let body = draft.templateId ? undefined : draft.body.trim();

  // Tokens de convite (.ics) só em e-mail — backend resolve a data pelo evento.
  if (body !== undefined && draft.channel === "email") {
    if (draft.inviteIcs) body = injectInviteToken(body, "{{invite}}");
    if (draft.inviteRecurrent) {
      body = injectInviteToken(body, "{{invite_recorrente}}");
    }
  }

  return {
    channel: draft.channel,
    templateId: draft.templateId ?? undefined,
    subject:
      !draft.templateId && draft.channel === "email" && draft.subject.trim()
        ? draft.subject.trim()
        : undefined,
    body,
    registrationIds: opts.hasEventId ? draft.registrationIds : undefined,
    manualRecipients: draft.manualRecipients,
  };
}
