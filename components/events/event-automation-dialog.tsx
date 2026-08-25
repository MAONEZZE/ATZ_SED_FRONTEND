"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildAutomationPatch,
  invalidAutomationFormReason,
  sameFormIds,
  triggerRequiresForm,
  triggerUsesSubmissionScope,
  TRIGGER_LABELS,
  type AutomationInput,
  type AutomationSnapshot,
} from "@/lib/api/automations";
import {
  useAllTemplates,
  useCreateAutomationGlobal,
  useUpdateAutomationGlobal,
} from "@/lib/api/global-messaging";
import { useForms } from "@/lib/api/forms";
import { useFormFields } from "@/lib/api/form-fields";
import { buildCron, parseCron, type CronFreq } from "@/lib/utils/automation-cron";
import { zonedInputToUtcIso, utcIsoToZonedInput } from "@/lib/utils/date-time-picker";
import type { Automation, AutomationTrigger, Form } from "@/lib/api/types";
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
import { today } from "@internationalized/date";

const RECURRING_TIMEZONE = "America/Sao_Paulo";
// on_date usa o mesmo fuso fixo do recorrente: o horário digitado é sempre
// horário de Brasília, independente do fuso do navegador de quem preenche.
const SEND_AT_TIMEZONE = RECURRING_TIMEZONE;

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

  // Todos os campos do evento (sem filtrar por formId) — usado só pra saber
  // quais formulários têm um campo "on_date_automation_field".
  const { data: formFields } = useFormFields(eventId);
  const dateFieldFormIds = useMemo(
    () =>
      new Set(
        (formFields ?? [])
          .filter((f) => f.type === "on_date_automation_field")
          .map((f) => f.formId),
      ),
    [formFields],
  );

  function invalidReason(form: Form): string | null {
    return invalidAutomationFormReason(form, trigger, dateFieldFormIds);
  }

  // Automações de evento usam estritamente os templates vinculados ao evento.
  const { data: templatesResponse } = useAllTemplates(1, 100, undefined, eventId);
  const templates = templatesResponse?.data ?? [];

  useEffect(() => {
    if (open) {
      setTemplateId(automation?.templateId ?? "");
      setTrigger(automation?.trigger ?? "on_registration");
      setFormIds(automation?.formIds ?? []);
      setSendAt(
        automation?.sendAt ? utcIsoToZonedInput(automation.sendAt, SEND_AT_TIMEZONE) : "",
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
  const isRecurring = trigger === "recurring";
  const requiresForm = triggerRequiresForm(trigger);
  const isSubmissionScope = triggerUsesSubmissionScope(trigger);

  function toggleForm(formId: string, checked: boolean) {
    setFormIds((prev) =>
      checked ? [...prev, formId] : prev.filter((id) => id !== formId),
    );
  }

  function handleSave() {
    if (!templateId) return toast.error("Selecione o template");

    const selectedForms = formIds
      .map((id) => sortedForms.find((f) => f.id === id))
      .filter((f): f is Form => Boolean(f));
    const invalidSelected = selectedForms.find((f) => invalidReason(f));
    if (invalidSelected) {
      return toast.error(
        `"${invalidSelected.name}" não pode ser usado neste gatilho (${invalidReason(invalidSelected)})`,
      );
    }

    // Editar sem tocar na seleção de formulários não deve exigir formIds —
    // o backend não valida obrigatoriedade quando a chave é omitida do PATCH,
    // e isso é o que permite reativar uma regra legada sem formulário.
    const formIdsDirty = !automation || !sameFormIds(formIds, automation.formIds);
    if (requiresForm && formIds.length === 0 && formIdsDirty) {
      return toast.error("Selecione ao menos um formulário");
    }

    let sendAtIso: string | null = null;
    if (trigger === "on_date") {
      if (!sendAt) return toast.error("Selecione a data e hora de envio");
      sendAtIso = zonedInputToUtcIso(sendAt, SEND_AT_TIMEZONE);
      if (new Date(sendAtIso) <= new Date()) {
        return toast.error("A data e hora devem estar no futuro");
      }
    }

    const cronValue = isRecurring
      ? buildCron({
          freq: cronFreq,
          time: cronTime,
          dayOfWeek: cronDayOfWeek,
          dayOfMonth: cronDayOfMonth,
        })
      : null;
    const timezoneValue = isRecurring ? RECURRING_TIMEZONE : null;

    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? "Automação atualizada" : "Automação criada");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };

    if (automation) {
      const original: AutomationSnapshot = {
        templateId: automation.templateId,
        trigger: automation.trigger,
        formIds: automation.formIds,
        cron: automation.cron,
        timezone: automation.timezone,
        sendAt: automation.sendAt,
        active: automation.active,
      };
      const current: AutomationSnapshot = {
        templateId,
        trigger,
        formIds,
        cron: cronValue,
        timezone: timezoneValue,
        sendAt: sendAtIso,
        active,
      };
      update.mutate(
        { eventId, id: automation.id, input: buildAutomationPatch(original, current) },
        onDone,
      );
    } else {
      const input: AutomationInput = {
        templateId,
        trigger,
        formIds,
        cron: cronValue ?? undefined,
        timezone: timezoneValue ?? undefined,
        sendAt: sendAtIso ?? undefined,
        active,
      };
      create.mutate({ eventId, input }, onDone);
    }
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
            <Label>Formulários{requiresForm && " *"}</Label>
            <p className="text-sm text-muted-foreground">
              {isSubmissionScope
                ? requiresForm
                  ? "Dispara só para quem enviou um destes formulários."
                  : "Opcional: sem seleção, dispara para inscritos de qualquer formulário."
                : requiresForm
                  ? "Dispara só para quem respondeu um destes formulários."
                  : "Opcional: sem seleção, vale para respostas de qualquer formulário."}
            </p>
            {!isSubmissionScope && (
              <p className="text-sm text-muted-foreground">
                Inscritos sem formulário de origem não são alcançados por uma regra
                escopada por formulário.
              </p>
            )}
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
                  {filteredForms.map((form) => {
                    const reason = invalidReason(form);
                    return (
                      <label
                        key={form.id}
                        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                          reason
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-accent"
                        }`}
                      >
                        <Checkbox
                          checked={formIds.includes(form.id)}
                          disabled={Boolean(reason)}
                          onCheckedChange={(checked) =>
                            toggleForm(form.id, Boolean(checked))
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {form.name}
                          {reason && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({reason})
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
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
                minValue={today(SEND_AT_TIMEZONE)}
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
