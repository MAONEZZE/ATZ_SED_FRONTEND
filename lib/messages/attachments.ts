/** Tamanho máximo de um anexo (25MB) — espelha MAX_ATTACHMENT_BYTES do backend. */
export const ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024;

/**
 * Tipos MIME aceitos — espelha o FileTypeValidator do backend
 * (global-messaging.controller.ts). Manter em sincronia com o regex de lá.
 */
const ATTACHMENT_MIME_REGEX =
  /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.[\w.-]+|application\/vnd\.ms-(excel|powerpoint)|video\/mp4|audio\/(mpeg|ogg))$/;

/** Valor para o atributo `accept` do <input type="file">. */
export const ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "video/mp4",
  "audio/mpeg",
  "audio/ogg",
].join(",");

/** True se o tipo do arquivo é aceito pelo backend. */
export function isAcceptedAttachment(file: File): boolean {
  return ATTACHMENT_MIME_REGEX.test(file.type);
}

/** Formata bytes em B / KB / MB legível. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TEMPLATE_ATTACHMENT_ACCEPT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
].join(",");

const TEMPLATE_ATTACHMENT_TYPES = new Set(TEMPLATE_ATTACHMENT_ACCEPT.split(","));

/** Validação local dos limites específicos do anexo único de template. */
export function validateTemplateAttachment(file: File): string | null {
  if (!TEMPLATE_ATTACHMENT_TYPES.has(file.type)) {
    return "Template aceita PDF, JPEG, PNG, WebP ou vídeo MP4.";
  }
  const limitMb = file.type === "video/mp4" ? 60 : 30;
  if (file.size > limitMb * 1024 * 1024) {
    return `Anexo excede o limite de ${limitMb} MB.`;
  }
  return null;
}
