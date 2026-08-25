"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DELAYED_TRIGGERS, TRIGGER_LABELS } from "@/lib/api/automations";
import {
  useAllTemplates,
  useCreateAutomationGlobal,
  useUpdateAutomationGlobal,
} from "@/lib/api/global-messaging";
import { useForms } from "@/lib/api/forms";
import { buildCron, parseCron, type CronFreq } from "@/lib/utils/automation-cron";
import type { Automation, AutomationTrigger } from "@/lib/api/types";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { today, getLocalTimeZone } from "@internationalized/date";

const MAX_DELAY_MINUTES = 2147483647;
const RECURRING_TIMEZONE = "America/Sao_Paulo";

const FREQ_OPTIONS: { value: CronFreq; label: string }[] = [
  { value: "DAILY", label: "Diário" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
];

const DOW_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function EventAutomationDialog({
  eventId,
  automation,
  open,
  onOpenChange,
}: {
  eventId: string;
  automation: Automation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateAutomationGlobal();
  const update = useUpdateAutomationGlobal();

  const [templateId, setTemplateId] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("on_registration");
  const [formIds, setFormIds] = useState<string[]>([]);
  const [delayMinutes, setDelayMinutes] = useState("");
  const [active, setActive] = useState(true);
  const [cronFreq, setCronFreq] = useState<CronFreq>("WEEKLY");
  const [cronTime, setCronTime] = useState("09:00");
  const [cronDayOfWeek, setCronDayOfWeek] = useState(1);
  const [cronDayOfMonth, setCronDayOfMonth] = useState(1);
  const [formsOpen, setFormsOpen] = useState(false);
  const [formSearch, setFormSearch] = useState("");
  const [sendAt, setSendAt] = useState("");

  const { data: forms } = useForms(eventId);
  const sortedForms = [...(forms ?? [])].sort((a, b) => a.order - b.order);
  const filteredForms = useMemo(
    () =>
      sortedForms.filter((form) =>
        form.name
          .toLocaleLowerCase("pt-BR")
          .includes(formSearch.toLocaleLowerCase("pt-BR")),
      ),
    [formSearch, sortedForms],
  );

  // Automações de evento usam estritamente os templates vinculados ao evento.
  const { data: templatesResponse } = useAllTemplates(1, 100, undefined, eventId);
  const templates = templatesResponse?.data ?? [];

  useEffect(() => {
    if (open) {
      setTemplateId(automation?.templateId ?? "");
      setTrigger(automation?.trigger ?? "on_registration");
      setFormIds(automation?.formIds ?? []);
      setSendAt(automation?.sendAt ?? "");
      setDelayMinutes(
        automation?.delayMinutes != null ? String(automation.delayMinutes) : "",
      );
      setActive(automation?.active ?? true);

      const parsed = automation?.cron ? parseCron(automation.cron) : null;
      setCronFreq(parsed?.freq ?? "WEEKLY");
      setCronTime(parsed?.time ?? "09:00");
      setCronDayOfWeek(parsed?.dayOfWeek ?? 1);
      setCronDayOfMonth(parsed?.dayOfMonth ?? 1);
    }
  }, [open, automation]);

  const isPending = create.isPending || update.isPending;
  const isEdit = Boolean(automation);
  const supportsDelay = DELAYED_TRIGGERS.includes(trigger);
  const isRecurring = trigger === "recurring";

  function toggleForm(formId: string, checked: boolean) {
    setFormIds((prev) =>
      checked ? [...prev, formId] : prev.filter((id) => id !== formId),
    );
  }

  function handleSave() {
    if (!templateId) return toast.error("Selecione o template");
    if (formIds.length === 0) {
      return toast.error("Selecione ao menos um formulário");
    }
    if (supportsDelay && delayMinutes && Number(delayMinutes) > MAX_DELAY_MINUTES) {
      return toast.error(`Atraso máximo é ${MAX_DELAY_MINUTES} minutos`);
    }
    if (trigger === "on_date") {
      if (!sendAt) return toast.error("Selecione a data e hora de envio");
      if (new Date(sendAt) <= new Date()) {
        return toast.error("A data e hora devem estar no futuro");
      }
    }
    const input = {
      templateId,
      trigger,
      formIds,
      delayMinutes: supportsDelay && delayMinutes ? Number(delayMinutes) : undefined,
      cron: isRecurring
        ? buildCron({
            freq: cronFreq,
            time: cronTime,
            dayOfWeek: cronDayOfWeek,
            dayOfMonth: cronDayOfMonth,
          })
        : undefined,
      timezone: isRecurring ? RECURRING_TIMEZONE : undefined,
      sendAt: trigger === "on_date" ? sendAt : undefined,
      active,
    };
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? "Automação atualizada" : "Automação criada");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (automation) update.mutate({ eventId, id: automation.id, input }, onDone);
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
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.channel === "whatsapp" ? "WhatsApp" : "E-mail"})
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

          <div className="space-y-2">
            <Label>Formulários *</Label>
            <p className="text-sm text-muted-foreground">
              Esta automação só é considerada para estes formulários.
            </p>
            <Popover open={formsOpen} onOpenChange={setFormsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  {formIds.length === 0
                    ? "Selecionar formulários"
                    : `${formIds.length} formulário${formIds.length === 1 ? "" : "s"} selecionado${formIds.length === 1 ? "" : "s"}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-2"
              >
                <Input
                  aria-label="Buscar formulário"
                  value={formSearch}
                  onChange={(event) => setFormSearch(event.target.value)}
                  placeholder="Buscar formulário..."
                  className="mb-2 h-8"
                />
                <div role="listbox" className="max-h-52 space-y-1 overflow-y-auto">
                  {filteredForms.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">
                      {sortedForms.length === 0
                        ? "Este evento ainda não tem formulários."
                        : "Nenhum formulário encontrado."}
                    </p>
                  )}
                  {filteredForms.map((form) => (
                    <label
                      key={form.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={formIds.includes(form.id)}
                        onCheckedChange={(checked) =>
                          toggleForm(form.id, Boolean(checked))
                        }
                      />
                      {form.name}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {trigger === "on_date" && (
            <div className="space-y-2">
              <Label htmlFor="eauto-send-at">Data e hora de envio *</Label>
              <DateTimePicker
                id="eauto-send-at"
                mode="datetime"
                value={sendAt}
                onChange={setSendAt}
                minValue={today(getLocalTimeZone())}
              />
            </div>
          )}

          {supportsDelay && (
            <div className="space-y-2">
              <Label htmlFor="eauto-delay">Atraso (minutos)</Label>
              <Input
                id="eauto-delay"
                type="number"
                min={0}
                max={MAX_DELAY_MINUTES}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
              />
            </div>
          )}

          {isRecurring && (
            <div className="space-y-4 rounded-xl border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={cronFreq}
                    onValueChange={(v) => setCronFreq(v as CronFreq)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQ_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eauto-cron-time">Hora</Label>
                  <Input
                    id="eauto-cron-time"
                    type="time"
                    value={cronTime}
                    onChange={(e) => setCronTime(e.target.value)}
                  />
                </div>

                {cronFreq === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label>Dia da semana</Label>
                    <Select
                      value={String(cronDayOfWeek)}
                      onValueChange={(v) => setCronDayOfWeek(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOW_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {cronFreq === "MONTHLY" && (
                  <div className="space-y-2">
                    <Label htmlFor="eauto-cron-dom">Dia do mês</Label>
                    <Input
                      id="eauto-cron-dom"
                      type="number"
                      min={1}
                      max={31}
                      value={cronDayOfMonth}
                      onChange={(e) => setCronDayOfMonth(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Fuso horário: America/Sao_Paulo.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="eauto-active">Ativa</Label>
            <Switch id="eauto-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <EditDialogFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          isSaving={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
