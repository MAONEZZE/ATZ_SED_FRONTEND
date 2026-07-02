"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Users } from "lucide-react";
import { useWhatsAppGroups } from "@/lib/api/profile";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Popover de grupos WhatsApp (canal WhatsApp). Auto-contido: busca os grupos da
 * instância Evolution e copia o ID do grupo para a área de transferência.
 */
export function WhatsAppGroupsPopover({
  evolutionInstance,
}: {
  evolutionInstance?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { data: groups, isLoading, isError } = useWhatsAppGroups();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          Grupos
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Grupos WhatsApp</p>
          {evolutionInstance && (
            <p className="text-xs text-muted-foreground">Instância: {evolutionInstance}</p>
          )}
        </div>
        {!evolutionInstance ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Configure sua instância Evolution no perfil para ver os grupos.
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="px-3 py-4 text-sm text-destructive">
            Erro ao carregar grupos. Verifique a instância Evolution.
          </p>
        ) : !groups || groups.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{g.subject}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Copiar ID do grupo ${g.subject}`}
                  onClick={() => {
                    navigator.clipboard.writeText(g.id);
                    toast.success("ID copiado para a área de transferência");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
