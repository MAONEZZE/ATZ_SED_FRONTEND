"use client";

import { Paperclip, Trash2 } from "lucide-react";
import type { MessageAttachment } from "@/lib/api/types";

/** Lista de anexos em chips, com botão de remover por item. */
export function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: MessageAttachment[];
  onRemove: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {attachments.map((a, index) => (
        <li
          key={`${a.filename}-${index}`}
          className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-xs"
        >
          <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{a.filename}</span>
          <button
            type="button"
            aria-label={`Remover ${a.filename}`}
            className="rounded-full p-0.5 hover:bg-muted"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </li>
      ))}
    </ul>
  );
}
