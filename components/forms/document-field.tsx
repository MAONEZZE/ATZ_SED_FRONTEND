"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FileUp, Loader2 } from "lucide-react";
import type { FileReference } from "@/lib/api/types";
import {
  DOCUMENT_ACCEPT,
  fileReferences,
  isLegacyDocumentValue,
  validateDocumentFile,
} from "@/lib/forms/documents";
import { DOCUMENT_MAX_FILES } from "@/lib/forms/field-types";
import {
  DocumentFileReference,
  DocumentValueRenderer,
} from "@/components/forms/document-value-renderer";
import { formatBytes } from "@/lib/messages/attachments";

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "failed";
  error?: string;
}

export type DocumentUpload = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<FileReference>;

export function DocumentField({
  inputId,
  value,
  onChange,
  upload,
  maxFiles = DOCUMENT_MAX_FILES,
  disabled = false,
  downloadable = false,
  onUploadingChange,
}: {
  inputId: string;
  value: unknown;
  onChange: (value: FileReference[]) => void;
  upload: DocumentUpload;
  maxFiles?: number;
  disabled?: boolean;
  /** Mostra o botão de baixar em cada arquivo (painel de inscritos). */
  downloadable?: boolean;
  onUploadingChange?: (fieldId: string, uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileReference[]>(() => fileReferences(value));
  const legacy = isLegacyDocumentValue(value);
  const uploading = tasks.some((task) => task.status === "uploading");

  useEffect(() => {
    setFiles(fileReferences(value));
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(inputId, uploading);
  }, [inputId, onUploadingChange, uploading]);

  useEffect(
    () => () => onUploadingChange?.(inputId, false),
    [inputId, onUploadingChange],
  );

  async function handleFiles(selected: FileList | null) {
    // Copia antes de limpar o input: a FileList é viva e esvazia com value = "".
    const chosen = selected ? Array.from(selected) : [];
    if (inputRef.current) inputRef.current.value = "";
    if (chosen.length === 0) return;
    setError(null);

    const replacingSingleFile = maxFiles === 1 && files.length === 1;
    const occupied = legacy || replacingSingleFile ? 0 : files.length;
    const available = Math.max(0, maxFiles - occupied);
    if (chosen.length > available) {
      setError(`Este campo aceita no máximo ${maxFiles} arquivo(s).`);
      return;
    }

    const valid: File[] = [];
    for (const file of chosen) {
      const validationError = validateDocumentFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
      } else {
        valid.push(file);
      }
    }
    if (valid.length === 0) return;

    const batch = valid.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}-${file.name}`,
    }));
    setTasks((current) => [
      ...current.filter((task) => task.status === "uploading"),
      ...batch.map(({ file, id }) => ({
        id,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
      })),
    ]);

    const results = await Promise.all(
      batch.map(async ({ file, id }) => {
        try {
          const reference = await upload(file, (progress) =>
            setTasks((current) =>
              current.map((task) => (task.id === id ? { ...task, progress } : task)),
            ),
          );
          setTasks((current) => current.filter((task) => task.id !== id));
          return reference;
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : "Falha no upload.";
          setTasks((current) =>
            current.map((task) =>
              task.id === id
                ? { ...task, status: "failed", error: message, progress: 0 }
                : task,
            ),
          );
          return null;
        }
      }),
    );
    const uploaded = results.filter((item): item is FileReference => item !== null);
    if (uploaded.length > 0) {
      const nextFiles =
        legacy || replacingSingleFile ? uploaded : [...files, ...uploaded];
      // Mantém o retorno do upload visível imediatamente, mesmo antes de o
      // formulário controlado propagar o novo valor de volta ao componente.
      setFiles(nextFiles);
      onChange(nextFiles);
    }
  }

  const singleFile = maxFiles === 1 ? files[0] : undefined;
  const singleImage = singleFile?.mimetype?.startsWith("image/");
  const canSelect = legacy || maxFiles === 1 || files.length < maxFiles;
  const activeTask = tasks.find((task) => task.status === "uploading");

  return (
    <div className="space-y-2">
      {legacy && <DocumentValueRenderer value={value} />}

      {canSelect && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="group relative flex aspect-[64/25] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={singleFile ? `Trocar ${singleFile.name}` : "Enviar arquivos"}
        >
          {activeTask ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="max-w-[85%] truncate text-sm font-medium">
                {activeTask.name}
              </span>
              <span className="text-xs">Enviando… {activeTask.progress}%</span>
              <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${activeTask.progress}%` }}
                />
              </div>
            </>
          ) : singleFile && singleImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={singleFile.url}
                alt={singleFile.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-left text-sm text-white">
                <span className="block truncate font-medium">{singleFile.name}</span>
                <span className="block text-xs text-white/80">
                  {singleFile.size == null
                    ? "Tamanho indisponível"
                    : formatBytes(singleFile.size)}
                </span>
              </span>
              {!disabled && !uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-transparent transition-all group-hover:bg-black/55 group-hover:text-white">
                  Clique para trocar o arquivo
                </span>
              )}
            </>
          ) : singleFile ? (
            <>
              <FileText className="h-10 w-10" />
              <span className="max-w-[85%] truncate text-sm font-medium text-foreground">
                {singleFile.name}
              </span>
              <span className="text-xs">
                {singleFile.size == null
                  ? "Tamanho indisponível"
                  : formatBytes(singleFile.size)}
              </span>
              <span className="text-xs">Clique para trocar o arquivo</span>
            </>
          ) : (
            <>
              <FileUp className="h-8 w-8" />
              <span className="text-sm font-medium">
                {legacy
                  ? "Clique para substituir o arquivo"
                  : files.length > 0
                    ? `Adicionar arquivos (${files.length}/${maxFiles})`
                    : "Clique para enviar arquivos"}
              </span>
              <span className="px-4 text-center text-xs">
                PDF, Word, texto, imagem ou vídeo
              </span>
            </>
          )}
        </button>
      )}

      {files.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm font-medium">
            Arquivos enviados ({files.length}/{maxFiles})
          </p>
          {files.map((file, index) => (
            <DocumentFileReference
              key={`${file.url}-${index}`}
              file={file}
              downloadable={downloadable}
              removeDisabled={disabled || uploading}
              onRemove={() => {
                const nextFiles = files.filter((_, itemIndex) => itemIndex !== index);
                setFiles(nextFiles);
                onChange(nextFiles);
              }}
            />
          ))}
        </div>
      )}

      {legacy && (
        <p className="text-xs text-amber-700">
          Arquivo legado: para alterá-lo, selecione um novo arquivo. Ele não será
          reenviado em base64.
        </p>
      )}

      {tasks.map((task) => (
        <div key={task.id} className="space-y-1 rounded-md border p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{task.name}</span>
            {task.status === "uploading" ? (
              <span>{task.progress}%</span>
            ) : (
              <button
                type="button"
                className="text-destructive underline"
                onClick={() =>
                  setTasks((current) => current.filter((t) => t.id !== task.id))
                }
              >
                Remover
              </button>
            )}
          </div>
          {task.status === "uploading" ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          ) : (
            <p className="text-destructive">{task.error}</p>
          )}
        </div>
      ))}

      {!legacy && maxFiles > 1 && files.length >= maxFiles ? (
        <p className="text-xs text-muted-foreground">
          Limite de {maxFiles} arquivo(s) atingido.
        </p>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple={maxFiles > 1}
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
