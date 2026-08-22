import { env } from "@/lib/env";
import type { PublicEvent, PublicFormField, PublicFormSummary } from "@/lib/api/types";

const REVALIDATE_SECONDS = 300;

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/events/${slug}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: [`event:${slug}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao carregar evento: ${res.status}`);
  return (await res.json()) as PublicEvent;
}

export async function getPublicForms(slug: string): Promise<PublicFormSummary[]> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/forms`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: [`event:${slug}`] },
  });
  if (!res.ok) return [];
  return (await res.json()) as PublicFormSummary[];
}

export async function getPublicFormFields(
  slug: string,
  formSlug: string,
): Promise<PublicFormField[]> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/forms/${formSlug}/fields`,
    { next: { revalidate: REVALIDATE_SECONDS, tags: [`event:${slug}`] } },
  );
  if (!res.ok) return [];
  return (await res.json()) as PublicFormField[];
}

export async function submitPublicFormResponse(
  slug: string,
  formSlug: string,
  payload: { phone?: string; answers: Record<string, unknown>; image_authorization?: boolean },
): Promise<{ registrationId: string | null; created: boolean }> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/public/events/${slug}/forms/${formSlug}/responses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
  return (await res.json()) as { registrationId: string | null; created: boolean };
}

export function answerKeyForField(
  field: Pick<PublicFormField, "label" | "type">,
): string {
  return field.label;
}

/**
 * Check-in público pelo QR genérico: só o telefone vai no corpo. O evento do dia
 * e a inscrição correspondente são resolvidos no backend.
 */
export async function submitPublicCheckin(phone: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    let message = "Falha ao fazer check-in";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
      }
    } catch {}
    throw new Error(message);
  }
}
