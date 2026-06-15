"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import { useCancelEvent } from "@/lib/api/events";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelEventDialog({ eventId, slug }: { eventId: string; slug: string }) {
  const [open, setOpen] = useState(false);

  const [notify, setNotify] = useState(true);
  const cancelEvent = useCancelEvent(eventId);

  function handleCancel() {
    cancelEvent.mutate(notify, {
      onSuccess: () => {
        revalidatePublicEvent(slug);
        toast.success(
          notify
            ? "Evento cancelado. Participantes serão notificados."
            : "Evento cancelado.",
        );
        setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" type="button">
          <Ban className="mr-2 h-4 w-4" />
          Cancelar evento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar evento?</DialogTitle>
          <DialogDescription>
            O evento deixa de aceitar inscrições e não poderá ser reativado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label htmlFor="notify" className="pr-4">
            Notificar participantes (WhatsApp/e-mail)
          </Label>
          <Switch id="notify" checked={notify} onCheckedChange={setNotify} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelEvent.isPending}
          >
            {cancelEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
