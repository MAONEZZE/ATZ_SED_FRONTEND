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

  attachments?: MessageAttachment[];
}

export function recipientCount(
  draft: Pick<SendMessageDraft, "registrationIds" | "manualRecipients">,
): number {
  return draft.registrationIds.length + draft.manualRecipients.length;
}

export const WHATSAPP_RECIPIENT_LIMIT = 30;

export function validateSendMessage(draft: SendMessageDraft): string | null {
  if (recipientCount(draft) === 0) return "Selecione ao menos um destinatário";
  if (draft.channel === "whatsapp" && recipientCount(draft) > WHATSAPP_RECIPIENT_LIMIT)
    return `WhatsApp: máximo ${WHATSAPP_RECIPIENT_LIMIT} destinatários por disparo`;
  if (!draft.body.trim()) return "Escreva a mensagem ou selecione um template";
  return null;
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
