"use client";

import { Trash2, Users } from "lucide-react";
import type { WhatsAppGroup } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

/** Lista dos grupos WhatsApp selecionados para o envio, com remoção por item. */
export function SelectedGroupsList({
  groups,
  onRemove,
}: {
  groups: WhatsAppGroup[];
  onRemove: (id: string) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <ul className="space-y-1">
      {groups.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{g.subject}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label={`Remover grupo ${g.subject}`}
            onClick={() => onRemove(g.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
