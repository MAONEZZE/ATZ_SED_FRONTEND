"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail, MessageCircle, Trash2, Zap } from "lucide-react";
import {
  DELAYED_TRIGGERS,
  TRIGGER_LABELS,
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useUpdateAutomation,
} from "@/lib/api/automations";
import { useTemplates } from "@/lib/api/templates";
import type { Automation, AutomationTrigger } from "@/lib/api/types";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "none";

function TriggerRow({
  eventId,
  trigger,
  automation,
}: {
  eventId: string;
  trigger: AutomationTrigger;
  automation: Automation | undefined;
}) {
  const { data: templates } = useTemplates(eventId);
  const create = useCreateAutomation(eventId);
  const update = useUpdateAutomation(eventId);
  const remove = useDeleteAutomation(eventId);

  const isDelayed = DELAYED_TRIGGERS.includes(trigger);
  const [delay, setDelay] = useState<string>(
    automation?.delayMinutes != null ? String(automation.delayMinutes) : "60",
  );

  const isPending = create.isPending || update.isPending || remove.isPending;
  const onError = (e: Error) => toast.error(e.message);

  function handleTemplateChange(templateId: string) {
    if (templateId === NONE) {
      if (automation) {
        remove.mutate(automation.id, {
          onSuccess: () => toast.success("Automação removida"),
          onError,
        });
      }
      return;
    }
    const delayMinutes = isDelayed ? Number(delay) || 0 : undefined;
    if (automation) {
      update.mutate(
        { id: automation.id, input: { templateId, delayMinutes } },
        { onSuccess: () => toast.success("Automação atualizada"), onError },
      );
    } else {
      create.mutate(
        { templateId, trigger, delayMinutes, active: true },
        { onSuccess: () => toast.success("Automação criada"), onError },
      );
    }
  }

  function handleDelayBlur() {
    if (!automation || !isDelayed) return;
    const delayMinutes = Number(delay) || 0;
    if (delayMinutes === (automation.delayMinutes ?? 0)) return;
    update.mutate(
      { id: automation.id, input: { delayMinutes } },
      { onSuccess: () => toast.success("Atraso atualizado"), onError },
    );
  }

  function handleActiveToggle(active: boolean) {
    if (!automation) return;
    update.mutate(
      { id: automation.id, input: { active } },
      {
        onSuccess: () =>
          toast.success(active ? "Automação ativada" : "Automação desativada"),
        onError,
      },
    );
  }

  return (
    <Card className={automation?.active ? "border-primary/40" : ""}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Zap
            className={`h-5 w-5 shrink-0 ${
              automation?.active ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <div className="min-w-0">
            <p className="font-medium">{TRIGGER_LABELS[trigger]}</p>
            {automation?.template && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                {automation.template.channel === "whatsapp" ? (
                  <MessageCircle className="h-3.5 w-3.5" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                {automation.template.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={automation?.templateId ?? NONE}
            disabled={isPending}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger
              className="w-[200px]"
              aria-label={`Template para ${TRIGGER_LABELS[trigger]}`}
            >
              <SelectValue placeholder="Sem automação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem automação</SelectItem>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} (
                  {template.channel === "whatsapp" ? "WhatsApp" : "E-mail"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isDelayed && automation && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`delay-${trigger}`} className="text-sm">
                Atraso (min)
              </Label>
              <Input
                id={`delay-${trigger}`}
                type="number"
                min={0}
                className="w-24"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                onBlur={handleDelayBlur}
              />
            </div>
          )}

          {automation && (
            <>
              <Switch
                checked={automation.active}
                disabled={isPending}
                onCheckedChange={handleActiveToggle}
                aria-label={`Ativar ${TRIGGER_LABELS[trigger]}`}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                aria-label={`Remover automação ${TRIGGER_LABELS[trigger]}`}
                onClick={() =>
                  remove.mutate(automation.id, {
                    onSuccess: () => toast.success("Automação removida"),
                    onError,
                  })
                }
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutomationsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: automations, isLoading } = useAutomations(eventId);
  const { data: templates, isLoading: templatesLoading } = useTemplates(eventId);

  if (isLoading || templatesLoading) return <LoadingSpinner />;

  if (templates && templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 font-semibold">Crie um template primeiro</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Automações enviam templates de mensagem. Crie um na aba Mensagens.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/events/${eventId}/messages`}>Ir para Mensagens</Link>
        </Button>
      </div>
    );
  }

  const byTrigger = new Map(automations?.map((a) => [a.trigger, a]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Configure mensagens automáticas por gatilho. O backend executa os envios —
        aqui você só define o quê e quando.
      </p>
      {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map((trigger) => (
        <TriggerRow
          key={trigger}
          eventId={eventId}
          trigger={trigger}
          automation={byTrigger.get(trigger)}
        />
      ))}
    </div>
  );
}
