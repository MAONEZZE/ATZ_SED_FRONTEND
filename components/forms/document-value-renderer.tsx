"use client";

/* eslint-disable @next/next/no-img-element */
import { FileText } from "lucide-react";
import type { FileReference } from "@/lib/api/types";
import {
  fileReferences,
  isImageReference,
  isLegacyDocumentValue,
} from "@/lib/forms/documents";
import { formatBytes } from "@/lib/messages/attachments";

function FileLink({ file }: { file: FileReference }) {
  if (isImageReference(file)) {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-fit overflow-hidden rounded-lg border"
        title={`Abrir ${file.name}`}
      >
        <img src={file.url} alt={file.name} className="h-28 w-40 object-cover" />
      </a>
    );
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-2 rounded-lg border p-2 hover:bg-muted/50"
    >
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{file.name}</span>
        <span className="block text-xs text-muted-foreground">
          {file.size == null ? "Tamanho indisponível" : formatBytes(file.size)}
        </span>
      </span>
    </a>
  );
}

/** Renderizador único dos formatos novo e legados de documentos. */
export function DocumentValueRenderer({ value }: { value: unknown }) {
  const files = fileReferences(value);
  if (files.length > 0) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {files.map((file, index) => (
          <FileLink key={`${file.url}-${index}`} file={file} />
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
