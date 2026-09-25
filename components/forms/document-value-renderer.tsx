"use client";

/* eslint-disable @next/next/no-img-element */
import { Download, FileText, Trash2 } from "lucide-react";
import type { FileReference } from "@/lib/api/types";
import {
  documentDownloadUrl,
  fileReferences,
  isLegacyDocumentValue,
} from "@/lib/forms/documents";
import { formatBytes } from "@/lib/messages/attachments";

export function DocumentFileReference({
  file,
  downloadable = false,
  onRemove,
  removeDisabled = false,
}: {
  file: FileReference;
  downloadable?: boolean;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        title={file.name}
        className="min-w-0 flex-1 hover:underline"
      >
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="block text-xs text-muted-foreground">
          {file.size == null ? "Tamanho indisponível" : formatBytes(file.size)}
        </span>
      </a>
      {downloadable && (
        <a
          href={documentDownloadUrl(file)}
          download={file.name}
          aria-label={`Baixar ${file.name}`}
          title="Baixar"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="h-4 w-4" />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remover ${file.name}`}
          title="Remover"
          disabled={removeDisabled}
          onClick={onRemove}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Renderizador único dos formatos novo e legados de documentos. */
export function DocumentValueRenderer({ value }: { value: unknown }) {
  const files = fileReferences(value);
  if (files.length > 0) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {files.map((file, index) => (
          <DocumentFileReference key={`${file.url}-${index}`} file={file} />
        ))}
      </div>
    );
  }

  if (isLegacyDocumentValue(value)) {
    const inlineImage = value.startsWith("data:image/");
    const urlImage = /\.(jpe?g|png|webp)(?:$|[?#])/i.test(value);
    if (inlineImage || urlImage) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-fit overflow-hidden rounded-lg border"
          title="Abrir imagem"
        >
          <img src={value} alt="Documento enviado" className="h-28 w-40 object-cover" />
        </a>
      );
    }
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="truncate">Abrir arquivo</span>
      </a>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}
