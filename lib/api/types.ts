import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";

export type EventStatus = "draft" | "published" | "cancelled" | "ended";

export type FunnelStatus = "pending" | "approved" | "rejected";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "select"
  | "multiselect"
  | "checkbox"
  | "image"
  | "date"
  | "linkedin"
  | "instagram";

export type FormFieldKind = "registration" | "post_event" | "nps";

export type MessageChannel = "whatsapp" | "email";

export type AutomationTrigger =
  | "on_registration"
  | "on_post_event"
  | "on_nps"
  | "on_approval"
  | "on_rejection"
  | "recurring";

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface EventObject {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  status: EventStatus;
  coverUrl: string | null;
  location: string | null;
  capacity: number | null;
  dressCode: string | null;
  groupLink: string | null;
  eventDate: string | null;
  endDate: string | null;
  recurrenceFreq: RecurrenceFreq | null;
  recurrenceInterval: number | null;
  recurrenceUntil: string | null;
  uazapiInstanceId: string | null;
  uazapiToken: string | null;
  sendToPipedrive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  formId: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown | null;
  order: number;
  isFixed: boolean;
  createdAt: string;
}

export interface Form {
  id: string;
  eventId: string;
  kind: FormFieldKind;
  description: string | null;
  postRegistrationMessage: string | null;
  linkPostSubscription: string | null;
  requireImageAuthorization: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  profileId: string;
  eventId: string;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
  };
}

export type PipedriveStatus = "pending" | "sent" | "failed" | "skipped";

export interface UserSubscription {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  registrationAnswers: Record<string, unknown> | null;
  postEventAnswers: Record<string, unknown> | null;
  npsAnswers: Record<string, unknown> | null;
  sendToPipedrive: boolean;
  pipedriveStatus: PipedriveStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  status: FunnelStatus;
  name: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;

  eventId: string | null;
  name: string;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  layoutConfig: EmailLayoutConfig | null;
  styleKey: EmailTemplateKey | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventRef {
  id: string;
  title: string;
}

export type TemplateWithEvent = MessageTemplate & { event: EventRef | null };
export type MessageLogWithEvent = MessageLog & { event: EventRef | null };

export interface TemplateAutomationSummary {
  id: string;
  trigger: AutomationTrigger;
  delayMinutes: number | null;
  active: boolean;
}

export interface MessageTemplateWithAutomation extends MessageTemplate {
  automation: TemplateAutomationSummary | null;
}

export interface Automation {
  id: string;
  eventId: string;
  templateId: string;
  trigger: AutomationTrigger;
  delayMinutes: number | null;
  cron: string | null;
  timezone: string | null;
  active: boolean;
  createdAt: string;
  template: {
    id: string;
    name: string;
    channel: MessageChannel;
  };
}

export interface MessageLog {
  id: string;
  eventId: string | null;
  registrationId: string | null;
  channel: MessageChannel;
  recipient: string;
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  delivered: boolean;
  read: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UazapiInstance {
  id: string;
  nickname: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  location: string | null;
  capacity: number | null;
  dressCode: string | null;
  eventDate: string | null;
  endDate: string | null;
  postRegistrationMessage: string | null;
  linkPostSubscription: string | null;
  requireImageAuthorization: boolean;
  status: "published";
}

export interface PublicFormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown | null;
  order: number;
}

export interface ManualRecipient {
  name: string;
  email?: string;
  phone?: string;
}

export interface MessageAttachment {
  /** path retornado por POST /messages/attachments */
  path: string;
  filename: string;
  mimetype: string;
  /** bytes do arquivo — usado só na UI, não vai no envio */
  size: number;
}

export interface SendMessageInput {
  eventId?: string;
  instanceId?: string;
  channel: MessageChannel;
  templateId?: string;
  subject?: string;
  body?: string;
  registrationIds?: string[];
  manualRecipients: ManualRecipient[];
  groupIds?: string[];
  attachments?: Omit<MessageAttachment, "size">[];
}

export interface SendMessageResult {
  queued: number;
  skipped: number;
  skippedReason: string[];
}

export interface EmailStyleResponse {
  professional: string;
  minimalist: string;
  elegant: string;
  warm: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WhatsAppGroup {
  id: string;
  subject: string;
}
