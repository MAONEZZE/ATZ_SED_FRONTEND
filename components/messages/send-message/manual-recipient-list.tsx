"use client";

import { Trash2 } from "lucide-react";
import type { ManualRecipient } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

/** Lista de destinatários adicionados manualmente, com remoção por item. */
export function ManualRecipientList({
  recipients,
  onRemove,
}: {
  recipients: ManualRecipient[];
  onRemove: (index: number) => void;
}) {
  if (recipients.length === 0) return null;
  return (
    <ul className="space-y-1">
      {recipients.map((r, index) => (
        <li
          key={`${r.name}-${index}`}
          className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
        >
          <span>
            <span className="font-medium">{r.name}</span>{" "}
            <span className="text-muted-foreground">
              {[r.email, r.phone].filter(Boolean).join(" · ")}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Remover ${r.name}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
