"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DELAYED_TRIGGERS, TRIGGER_LABELS } from "@/lib/api/automations";
import {
  useAllTemplates,
  useCreateAutomationGlobal,
  useUpdateAutomationGlobal,
} from "@/lib/api/global-messaging";
import { useEvents } from "@/lib/api/events";
import type { AutomationTrigger, AutomationWithEvent } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GlobalAutomationDialog({
  automation,
  open,
  onOpenChange,
}: {
  automation: AutomationWithEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eventsResponse } = useEvents();
  const events = eventsResponse?.data;
  const create = useCreateAutomationGlobal();
  const update = useUpdateAutomationGlobal();

  const [eventId, setEventId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("on_registration");
  const [delayMinutes, setDelayMinutes] = useState("");
  const [active, setActive] = useState(true);

  const { data: templatesResponse } = useAllTemplates(1, 100);
  const templates = templatesResponse?.data;

  useEffect(() => {
    if (open) {
      setEventId(automation?.eventId ?? "");
      setTemplateId(automation?.templateId ?? "");
      setTrigger(automation?.trigger ?? "on_registration");
      setDelayMinutes(
        automation?.delayMinutes != null ? String(automation.delayMinutes) : "",
      );
      setActive(automation?.active ?? true);
    }
  }, [open, automation]);

  const isPending = create.isPending || update.isPending;
  const isEdit = Boolean(automation);
  const supportsDelay = DELAYED_TRIGGERS.includes(trigger);

  function handleSave() {
    if (!eventId) return toast.error("Selecione o evento");
    if (!templateId) return toast.error("Selecione o template");
    const input = {
      templateId,
      trigger,
      delayMinutes: supportsDelay && delayMinutes ? Number(delayMinutes) : undefined,
      active,
    };
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? "Automação atualizada" : "Automação criada");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (automation)
      update.mutate({ eventId: automation.eventId, id: automation.id, input }, onDone);
    else create.mutate({ eventId, input }, onDone);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar automação" : "Nova automação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Evento *</Label>
            <Select
              value={eventId}
              onValueChange={(v) => {
                setEventId(v);
                setTemplateId("");
              }}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {events?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!eventId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.channel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gatilho</Label>
            <Select
              value={trigger}
              onValueChange={(v) => setTrigger(v as AutomationTrigger)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supportsDelay && (
            <div className="space-y-2">
              <Label htmlFor="gauto-delay">Atraso (minutos)</Label>
              <Input
                id="gauto-delay"
                type="number"
                min={0}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="gauto-active">Ativa</Label>
            <Switch id="gauto-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
