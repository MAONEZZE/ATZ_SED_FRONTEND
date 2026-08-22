export const queryKeys = {
  events: (params?: { page?: number; limit?: number; folderId?: string | null }) =>
    params ? (["events", params] as const) : (["events"] as const),
  event: (id: string) => ["events", id] as const,
  forms: (eventId: string) => ["events", eventId, "forms"] as const,
  form: (eventId: string, formId: string) =>
    ["events", eventId, "forms", formId] as const,
  formFields: (eventId: string, formId?: string) =>
    formId
      ? (["events", eventId, "form-fields", formId] as const)
      : (["events", eventId, "form-fields"] as const),
  formResponses: (
    eventId: string,
    params?: { formId?: string; search?: string; page?: number; limit?: number },
  ) =>
    params
      ? (["events", eventId, "form-responses", params] as const)
      : (["events", eventId, "form-responses"] as const),
  collaborators: (eventId: string) => ["events", eventId, "collaborators"] as const,
  registrations: (
    eventId: string,
    params?: { status?: string; search?: string; page?: number; limit?: number },
  ) =>
    params
      ? (["events", eventId, "registrations", params] as const)
      : (["events", eventId, "registrations"] as const),
  registration: (eventId: string, id: string) =>
    ["events", eventId, "registrations", id] as const,
  automations: (
    eventId: string,
    params?: { page?: number; limit?: number; folderId?: string | null },
  ) =>
    params
      ? (["events", eventId, "automations", params] as const)
      : (["events", eventId, "automations"] as const),
  folders: (params?: { resourceType?: string; eventId?: string }) =>
    params ? (["folders", params] as const) : (["folders"] as const),
  landing: (eventId: string) => ["events", eventId, "landing"] as const,
  messageLogs: (eventId: string, params?: { page?: number; limit?: number }) =>
    params
      ? (["events", eventId, "message-logs", params] as const)
      : (["events", eventId, "message-logs"] as const),
  profile: ["profile"] as const,
  whatsappInstances: ["whatsapp-instances"] as const,

  allTemplates: (params?: {
    page?: number;
    limit?: number;
    channel?: string;
    eventId?: string | null;
    folderId?: string | null;
  }) =>
    params
      ? (["global", "templates", params] as const)
      : (["global", "templates"] as const),
  allMessageLogs: (params?: { page?: number; limit?: number }) =>
    params
      ? (["global", "message-logs", params] as const)
      : (["global", "message-logs"] as const),
};
