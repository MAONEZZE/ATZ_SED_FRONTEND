"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus } from "lucide-react";
import type { ManualRecipient, MessageChannel } from "@/lib/api/types";
import { PhoneField } from "@/components/forms/phone-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Popover "Adicionar manual": formulário de um destinatário avulso. */
export function ManualRecipientPopover({
  open,
  onOpenChange,
  draft,
  setDraft,
  channel,
  onAdd,
  addDisabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ManualRecipient;
  setDraft: Dispatch<SetStateAction<ManualRecipient>>;
  channel: MessageChannel;
  onAdd: () => void;
  addDisabled: boolean;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" className="h-7 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Adicionar manual
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2">
        <p className="text-sm font-medium">Adicionar destinatário</p>
        <Input
          placeholder="Nome"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <Input
          placeholder="nome@email.com"
          type="email"
          value={draft.email}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        />
        {channel === "whatsapp" ? (
          <Input
            placeholder="+5511999999999 ou 120363@g.us"
            value={draft.phone ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          />
        ) : (
          <PhoneField
            value={draft.phone ?? ""}
            onChange={(phone) => setDraft((d) => ({ ...d, phone }))}
          />
        )}
        <Button
          type="button"
          className="w-full gap-1.5"
          onClick={onAdd}
          disabled={addDisabled}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
