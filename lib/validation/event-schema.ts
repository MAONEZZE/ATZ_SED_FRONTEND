import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    location: z.string().optional(),
    capacity: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1), "Capacidade mínima: 1"),
    dressCode: z.string().optional(),
    groupLink: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
    eventDate: z.string().optional(),
    endDate: z.string().optional(),
    recurrenceFreq: z
      .enum(["", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
    recurrenceInterval: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1), "Intervalo mínimo: 1"),
    recurrenceUntil: z.string().optional(),
    whatsappInstanceId: z.string().optional(),
    whatsappToken: z.string().optional(),
  })
  .refine(
    (v) => !v.eventDate || !v.endDate || new Date(v.endDate) > new Date(v.eventDate),
    { message: "Término deve ser após o início", path: ["endDate"] },
  )
  .refine(
    (v) =>
      !v.recurrenceFreq ||
      !v.recurrenceUntil ||
      !v.eventDate ||
      new Date(v.recurrenceUntil) > new Date(v.eventDate),
    { message: "Repetir até deve ser após o início", path: ["recurrenceUntil"] },
  );

export type EventFormValues = z.infer<typeof eventSchema>;

export function toEventInput(values: EventFormValues) {
  const hasRecurrence = Boolean(values.recurrenceFreq);
  return {
    title: values.title,
    location: values.location || undefined,
    capacity: values.capacity ? Number(values.capacity) : undefined,
    dressCode: values.dressCode || undefined,
    groupLink: values.groupLink || undefined,
    eventDate: values.eventDate ? new Date(values.eventDate).toISOString() : undefined,
    endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    recurrenceFreq: values.recurrenceFreq ? values.recurrenceFreq : null,
    recurrenceInterval: hasRecurrence
      ? values.recurrenceInterval
        ? Number(values.recurrenceInterval)
        : 1
      : null,
    recurrenceUntil:
      hasRecurrence && values.recurrenceUntil
        ? new Date(values.recurrenceUntil).toISOString()
        : null,
    whatsappInstanceId: values.whatsappInstanceId || undefined,
    whatsappToken: values.whatsappToken || undefined,
  };
}
