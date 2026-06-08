/** Chaves centralizadas do TanStack Query */
export const queryKeys = {
  events: (params?: { page?: number; limit?: number }) =>
    params ? (["events", params] as const) : (["events"] as const),
  event: (id: string) => ["events", id] as const,
  formFields: (eventId: string) => ["events", eventId, "form-fields"] as const,
  registrations: (eventId: string, status?: string) =>
    status
      ? (["events", eventId, "registrations", { status }] as const)
      : (["events", eventId, "registrations"] as const),
  registration: (eventId: string, id: string) =>
    ["events", eventId, "registrations", id] as const,
  templates: (eventId: string) => ["events", eventId, "templates"] as const,
  automations: (eventId: string) => ["events", eventId, "automations"] as const,
  landing: (eventId: string) => ["events", eventId, "landing"] as const,
  messageLogs: (eventId: string) => ["events", eventId, "message-logs"] as const,
  profile: ["profile"] as const,
  // Visão global (todos os eventos do usuário)
  allTemplates: ["global", "templates"] as const,
  allAutomations: ["global", "automations"] as const,
  allMessageLogs: ["global", "message-logs"] as const,
};
