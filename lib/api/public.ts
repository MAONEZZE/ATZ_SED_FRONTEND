import { env } from "@/lib/env";
import type { PublicEvent, PublicFormField, Registration } from "@/lib/api/types";

const REVALIDATE_SECONDS = 300;

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/events/${slug}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: [`event:${slug}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao carregar evento: ${res.status}`);
  return (await res.json()) as PublicEvent;
}

export async function getPublicFormFields(slug: string): Promise<PublicFormField[]> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/form-fields`,
    { next: { revalidate: REVALIDATE_SECONDS, tags: [`event:${slug}`] } },
  );
  if (!res.ok) return [];
  return (await res.json()) as PublicFormField[];
}

export async function createPublicRegistration(
  slug: string,
  answers: Record<string, unknown>,
): Promise<Registration> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/registrations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    },
  );
  if (!res.ok) {
    let message = "Falha ao enviar inscrição";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
      }
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as Registration;
}

export function answerKeyForField(
  field: Pick<PublicFormField, "label" | "type">,
): string {
  const normalized = field.label.trim().toLowerCase();
  if (field.type === "email" || normalized === "e-mail" || normalized === "email") {
    return "email";
  }
  if (field.type === "phone" || normalized === "telefone") return "telefone";
  if (normalized === "nome" || normalized === "name") return "nome";
  return field.label;
}
