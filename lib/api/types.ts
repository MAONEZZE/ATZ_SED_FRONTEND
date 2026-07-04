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
  | "date";

export type FormFieldKind = "registration" | "post_event" | "nps";

export type MessageChannel = "whatsapp" | "email";

export type AutomationTrigger =
  | "on_registration"
  | "on_post_event"
  | "on_nps"
  | "on_approval"
  | "on_rejection"
  | "before_event"
  | "after_event";

export type LandingSectionType =
  | "hero"
  | "about"
  | "registration"
  | "speakers"
  | "schedule"
  | "venue"
  | "faq"
  | "gallery"
  | "testimonials"
  | "sponsors";

export type UserRole = "admin" | "organizer";

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface EventObject {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  status: EventStatus;
  description: string | null;
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
  postRegistrationMessage: string | null;
  evolutionInstance: string | null;
  sendToPipedrive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  eventId: string;
  label: string;
  type: FieldType;
  kind: FormFieldKind;
  required: boolean;
  options: unknown | null;
  order: number;
  isFixed: boolean;
  createdAt: string;
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
  active: boolean;
  createdAt: string;
  template: {
    id: string;
    name: string;
    channel: MessageChannel;
  };
}

export interface LandingSection {
  id: string;
  landingPageId: string;
  type: LandingSectionType;
  order: number;
  enabled: boolean;
  content: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPage {
  id: string;
  eventId: string;
  sections: LandingSection[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageLog {
  id: string;
  eventId: string | null;
  registrationId: string | null;
  channel: MessageChannel;
  recipient: string;
  body: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  evolutionInstance: string | null;
  roles: { id: string; role: UserRole }[];
  createdAt: string;
  updatedAt: string;
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
  status: "published";
  landingPage: {
    id: string;
    sections: LandingSection[];
  };
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
  filename: string;
  mimeType: string;

  contentBase64: string;
}

export interface InviteRecurrencePayload {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  until?: string;
}

export interface InvitePayload {
  /** "YYYY-MM-DD" */
  date: string;
  allDay: boolean;
  /** "HH:mm" — ausente quando allDay */
  startTime?: string;
  /** "HH:mm" — ausente quando allDay */
  endTime?: string;
  /** IANA timezone id */
  timezone: string;
  /** null = convite único */
  recurrence?: InviteRecurrencePayload | null;
}

export interface SendMessageInput {
  eventId?: string;
  channel: MessageChannel;
  templateId?: string;
  subject?: string;
  body?: string;
  registrationIds?: string[];
  manualRecipients: ManualRecipient[];
  attachments?: MessageAttachment[];
  invite?: InvitePayload;
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
