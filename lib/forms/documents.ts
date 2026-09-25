import type { FileReference } from "@/lib/api/types";

export const DOCUMENT_ACCEPT = [
  "text/plain",
  "text/csv",
  "application/csv",
  "application/rtf",
  "text/rtf",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
].join(",");

const DOCUMENT_TYPES = new Set(DOCUMENT_ACCEPT.split(","));
const TEN_MB = 10 * 1024 * 1024;
const FIFTY_MB = 50 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  if (!DOCUMENT_TYPES.has(file.type)) return "Tipo de documento não permitido.";
  const max = file.type.startsWith("video/") ? FIFTY_MB : TEN_MB;
  if (file.size > max) {
    return `Arquivo excede o limite de ${max === FIFTY_MB ? 50 : 10} MB.`;
  }
  return null;
}

export function isFileReference(value: unknown): value is FileReference {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as FileReference).url === "string" &&
    typeof (value as FileReference).name === "string",
  );
}

export function fileReferences(value: unknown): FileReference[] {
  return Array.isArray(value) ? value.filter(isFileReference) : [];
}

export function isLegacyDocumentValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image/"))
  );
}

export function isImageReference(file: FileReference): boolean {
  return Boolean(
    file.mimetype?.startsWith("image/") ||
    /\.(jpe?g|png|webp)(?:$|[?#])/i.test(file.url) ||
    /\.(jpe?g|png|webp)$/i.test(file.name),
  );
}
