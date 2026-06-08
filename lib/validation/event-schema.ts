import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    description: z.string().optional(),
    location: z.string().optional(),
    capacity: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && Number(v) >= 1),
        "Capacidade mínima: 1",
      ),
    dressCode: z.string().optional(),
    groupLink: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
    eventDate: z.string().optional(),
    endDate: z.string().optional(),
    postRegistrationMessage: z.string().optional(),
  })
  .refine(
    (v) =>
      !v.eventDate || !v.endDate || new Date(v.endDate) > new Date(v.eventDate),
    { message: "Término deve ser após o início", path: ["endDate"] },
  );

export type EventFormValues = z.infer<typeof eventSchema>;

/** Converte valores do form para o payload da API (remove vazios, ISO date) */
export function toEventInput(values: EventFormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    location: values.location || undefined,
    capacity: values.capacity ? Number(values.capacity) : undefined,
    dressCode: values.dressCode || undefined,
    groupLink: values.groupLink || undefined,
    eventDate: values.eventDate ? new Date(values.eventDate).toISOString() : undefined,
    endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    postRegistrationMessage: values.postRegistrationMessage || undefined,
  };
}
