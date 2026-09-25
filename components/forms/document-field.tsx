"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import type { FileReference } from "@/lib/api/types";
import {
  DOCUMENT_ACCEPT,
  fileReferences,
  isLegacyDocumentValue,
  validateDocumentFile,
} from "@/lib/forms/documents";
import { DocumentValueRenderer } from "@/components/forms/document-value-renderer";
import { Button } from "@/components/ui/button";

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
  maxFiles = 1,
  disabled = false,
  onUploadingChange,
}: {
  inputId: string;
  value: unknown;
  onChange: (value: FileReference[]) => void;
  upload: DocumentUpload;
  maxFiles?: number;
  disabled?: boolean;
  onUploadingChange?: (fieldId: string, uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const files = fileReferences(value);
  const legacy = isLegacyDocumentValue(value);
  const uploading = tasks.some((task) => task.status === "uploading");

  useEffect(() => {
    onUploadingChange?.(inputId, uploading);
  }, [inputId, onUploadingChange, uploading]);

  useEffect(
    () => () => onUploadingChange?.(inputId, false),
    [inputId, onUploadingChange],
  );

  async function handleFiles(selected: FileList | null) {
    if (inputRef.current) inputRef.current.value = "";
    const chosen = selected ? Array.from(selected) : [];
    if (chosen.length === 0) return;
    setError(null);

    const occupied = legacy ? 0 : files.length;
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
    if (uploaded.length > 0) onChange(legacy ? uploaded : [...files, ...uploaded]);
  }

  return (
    <div className="space-y-2">
      {(files.length > 0 || legacy) && <DocumentValueRenderer value={value} />}

      {files.map((file, index) => (
        <div
          key={`${file.url}-remove`}
          className="flex items-center justify-between gap-2"
        >
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Remover
          </Button>
        </div>
      ))}

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

      {!legacy && files.length >= maxFiles ? (
        <p className="text-xs text-muted-foreground">
          Limite de {maxFiles} arquivo(s) atingido.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 h-4 w-4" />
          )}
          {legacy ? "Substituir arquivo" : "Selecionar arquivo(s)"}
        </Button>
      )}

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
