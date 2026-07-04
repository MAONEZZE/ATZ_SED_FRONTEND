import type { MessageAttachment } from "@/lib/api/types";

/** Tamanho máximo de um anexo (10MB). */
export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

/** Lê um arquivo como anexo base64 pronto para envio. */
export function readAsAttachment(file: File): Promise<MessageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  });
}

/** Estima o tamanho em bytes de uma string base64 (descontando padding). */
export function base64Bytes(b64: string): number {
  const len = b64.length;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((len * 3) / 4) - padding);
}

/** Formata bytes em B / KB / MB legível. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
