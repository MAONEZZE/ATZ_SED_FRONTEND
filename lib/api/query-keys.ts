export const queryKeys = {
  events: (params?: { page?: number; limit?: number }) =>
    params ? (["events", params] as const) : (["events"] as const),
  event: (id: string) => ["events", id] as const,
  formFields: (eventId: string, kind?: string) =>
    kind
      ? (["events", eventId, "form-fields", kind] as const)
      : (["events", eventId, "form-fields"] as const),
  collaborators: (eventId: string) => ["events", eventId, "collaborators"] as const,
  postEventResponses: (eventId: string, params?: { page?: number; limit?: number }) =>
    params
      ? (["events", eventId, "post-event-responses", params] as const)
      : (["events", eventId, "post-event-responses"] as const),
  registrations: (
    eventId: string,
    params?: { status?: string; search?: string; page?: number; limit?: number },
  ) =>
    params
      ? (["events", eventId, "registrations", params] as const)
      : (["events", eventId, "registrations"] as const),
  registration: (eventId: string, id: string) =>
    ["events", eventId, "registrations", id] as const,
  userSubscriptions: (
    eventId: string,
    params?: { search?: string; page?: number; limit?: number },
  ) =>
    params
      ? (["events", eventId, "user-subscriptions", params] as const)
      : (["events", eventId, "user-subscriptions"] as const),
  templates: (eventId: string) => ["events", eventId, "templates"] as const,
  automations: (eventId: string) => ["events", eventId, "automations"] as const,
  landing: (eventId: string) => ["events", eventId, "landing"] as const,
  messageLogs: (eventId: string, params?: { page?: number; limit?: number }) =>
    params
      ? (["events", eventId, "message-logs", params] as const)
      : (["events", eventId, "message-logs"] as const),
  profile: ["profile"] as const,

  allTemplates: (params?: { page?: number; limit?: number; channel?: string }) =>
    params
      ? (["global", "templates", params] as const)
      : (["global", "templates"] as const),
  allAutomations: (params?: { page?: number; limit?: number }) =>
    params
      ? (["global", "automations", params] as const)
      : (["global", "automations"] as const),
  allMessageLogs: (params?: { page?: number; limit?: number }) =>
    params
      ? (["global", "message-logs", params] as const)
      : (["global", "message-logs"] as const),
};
