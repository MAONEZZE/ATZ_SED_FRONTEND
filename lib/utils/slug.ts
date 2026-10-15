import { ApiError } from "@/lib/api/client";

/** Mesmas regras do backend (`POST /events` e `PATCH /events/:id`). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 100;

export const SLUG_FORMAT_MESSAGE =
  "Use só letras minúsculas sem acento, números e hífens simples (sem hífen no início ou no fim)";
export const SLUG_LENGTH_MESSAGE = `O slug deve ter entre ${SLUG_MIN} e ${SLUG_MAX} caracteres`;
export const SLUG_IN_USE_MESSAGE = "Este slug já está em uso por outro evento";

/**
 * Normalização aplicada enquanto o usuário digita: minúsculas, sem acento,
 * espaço/underscore viram hífen, demais caracteres saem e hífens repetidos
 * colapsam. O hífen final fica, senão não daria para digitar "meu-evento".
 */
export function normalizeSlugInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX);
}

/**
 * Slug sugerido a partir do título, já num formato aceito pelo backend.
 * Vazio quando o título não rende um slug válido: aí o backend gera.
 */
export function slugFromTitle(title: string): string {
  const slug = normalizeSlugInput(title).replace(/-+$/, "");
  return slug.length >= SLUG_MIN ? slug : "";
}

export function publicEventUrl(origin: string, slug: string): string {
  return `${origin}/e/${slug}`;
}

/**
 * Mensagem para exibir no campo slug quando o erro da API é sobre ele
 * (409 "Slug already in use" ou 400 do class-validator citando `slug`).
 */
export function slugErrorFromApi(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 409 && /slug/i.test(error.message)) return SLUG_IN_USE_MESSAGE;
  if (error.status === 400 && /\bslug\b/.test(error.message)) {
    return /longer|shorter/.test(error.message)
      ? SLUG_LENGTH_MESSAGE
      : SLUG_FORMAT_MESSAGE;
  }
  return null;
}
