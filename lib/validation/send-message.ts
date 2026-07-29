import type {
  ManualRecipient,
  MessageAttachment,
  MessageChannel,
  SendMessageInput,
} from "@/lib/api/types";

export interface SendMessageDraft {
  channel: MessageChannel;
  templateId: string | null;
  subject: string;
  body: string;
  registrationIds: string[];
  manualRecipients: ManualRecipient[];
  groupIds: string[];
  instanceId?: string;

  attachments?: MessageAttachment[];
}

export function recipientCount(
  draft: Pick<SendMessageDraft, "registrationIds" | "manualRecipients">,
): number {
  return draft.registrationIds.length + draft.manualRecipients.length;
}

export const WHATSAPP_RECIPIENT_LIMIT = 30;

export function validateSendMessage(
  draft: SendMessageDraft,
  opts: { hasEventId: boolean },
): string | null {
  if (!opts.hasEventId && !draft.instanceId)
    return "Selecione um evento ou uma instância antes de enviar";
  if (recipientCount(draft) === 0 && draft.groupIds.length === 0)
    return "Selecione ao menos um destinatário";
  if (draft.channel === "whatsapp" && recipientCount(draft) > WHATSAPP_RECIPIENT_LIMIT)
    return `WhatsApp: máximo ${WHATSAPP_RECIPIENT_LIMIT} destinatários por disparo`;
  if (!draft.body.trim()) return "Escreva a mensagem ou selecione um template";
  return null;
}

export const INVITE_TOKEN = "{{invite}}";

export function injectInviteToken(body: string, token: string): string {
  if (body.includes(token)) return body;
  const closeIdx = body.toLowerCase().lastIndexOf("</body>");
  if (closeIdx !== -1) {
    return `${body.slice(0, closeIdx)}${token}\n${body.slice(closeIdx)}`;
  }
  return `${body}\n${token}`;
}

export function removeInviteToken(body: string, token: string): string {
  return body.split(`${token}\n`).join("").split(token).join("");
}

export function hasInviteToken(body: string, token: string): boolean {
  return body.includes(token);
}

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

export function toSendMessageInput(
  draft: SendMessageDraft,
  opts: { hasEventId: boolean },
): SendMessageInput {
  const body = draft.body.trim();

  return {
    channel: draft.channel,
    subject:
      draft.channel === "email" && draft.subject.trim()
        ? draft.subject.trim()
        : undefined,
    body,
    registrationIds: opts.hasEventId ? draft.registrationIds : undefined,
    manualRecipients: draft.manualRecipients,
    groupIds:
      draft.channel === "whatsapp" && draft.groupIds.length > 0
        ? draft.groupIds
        : undefined,
    instanceId: draft.instanceId || undefined,
    attachments:
      draft.attachments && draft.attachments.length > 0
        ? draft.attachments.map(({ path, filename, mimetype }) => ({
            path,
            filename,
            mimetype,
          }))
        : undefined,
  };
}
