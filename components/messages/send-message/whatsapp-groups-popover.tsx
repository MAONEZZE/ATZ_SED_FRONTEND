"use client";

import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useWhatsAppGroups } from "@/lib/api/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Popover de grupos WhatsApp (canal WhatsApp): lista grupos da instância WhatsApp
 * selecionada e permite marcar quais recebem o envio (groupIds).
 */
export function WhatsAppGroupsPopover({
  instanceId,
  selectedGroupIds,
  onToggleGroup,
}: {
  instanceId?: string;
  selectedGroupIds: Set<string>;
  onToggleGroup: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: groups, isLoading, isError } = useWhatsAppGroups(instanceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={!instanceId}
        >
          <Users className="h-3.5 w-3.5" />
          Grupos{selectedGroupIds.size > 0 ? ` (${selectedGroupIds.size})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Grupos WhatsApp</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="px-3 py-4 text-sm text-destructive">
            Erro ao carregar grupos. Verifique a instância WhatsApp.
          </p>
        ) : !groups || groups.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {groups.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-muted"
              >
                <Checkbox
                  checked={selectedGroupIds.has(g.id)}
                  onCheckedChange={() => onToggleGroup(g.id)}
                  aria-label={`Selecionar grupo ${g.subject}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{g.subject}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
