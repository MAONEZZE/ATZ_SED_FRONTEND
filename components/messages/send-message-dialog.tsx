"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SendMessageForm } from "@/components/messages/send-message-form";

export function SendMessageDialog({
  open,
  onOpenChange,
  eventId,
  initialRegistrationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  initialRegistrationId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar mensagem</DialogTitle>
        </DialogHeader>
        <SendMessageForm
          key={eventId ?? "global"}
          eventId={eventId}
          initialRegistrationId={initialRegistrationId}
        />
      </DialogContent>
    </Dialog>
  );
}
