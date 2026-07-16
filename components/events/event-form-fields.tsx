"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import type { EventFormValues } from "@/lib/validation/event-schema";
import { useEvolutionInstances } from "@/lib/api/evolution-instances";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FREQ_OPTIONS = [
  { value: "DAILY", label: "Diária" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "YEARLY", label: "Anual" },
] as const;

const INTERVAL_UNIT: Record<string, string> = {
  DAILY: "dia(s)",
  WEEKLY: "semana(s)",
  MONTHLY: "mês(es)",
  YEARLY: "ano(s)",
};

const NO_RECURRENCE = "none";
const NO_INSTANCE = "none";

export function EventFormFields({
  form,
  disabled = false,
}: {
  form: UseFormReturn<EventFormValues>;
  disabled?: boolean;
}) {
  const { register, formState } = form;
  const errors = formState.errors;
  const freq = form.watch("recurrenceFreq");
  const isRecurring = Boolean(freq);
  const { data: evolutionInstances } = useEvolutionInstances();

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" disabled={disabled} {...register("title")} />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Início</Label>
        <Controller
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <DateTimePicker
              id="eventDate"
              mode="datetime"
              disabled={disabled}
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">Término</Label>
        <Controller
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <DateTimePicker
              id="endDate"
              mode="datetime"
              disabled={disabled}
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        {errors.endDate && (
          <p className="text-sm text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input id="location" disabled={disabled} {...register("location")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Capacidade</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          disabled={disabled}
          {...register("capacity")}
        />
        {errors.capacity && (
          <p className="text-sm text-destructive">{errors.capacity.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dressCode">Dress code</Label>
        <Input id="dressCode" disabled={disabled} {...register("dressCode")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="groupLink">Link do grupo (WhatsApp)</Label>
        <Input
          id="groupLink"
          type="url"
          placeholder="https://chat.whatsapp.com/..."
          disabled={disabled}
          {...register("groupLink")}
        />
        {errors.groupLink && (
          <p className="text-sm text-destructive">{errors.groupLink.message}</p>
        )}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="evolutionInstanceId">Instância</Label>
        <Controller
          control={form.control}
          name="evolutionInstanceId"
          render={({ field }) => {
            const [selectedInstance] = evolutionInstances?.filter(
              (instance) => instance.id === field.value,
            ) ?? [];
            return (
              <Select
                disabled={disabled}
                value={field.value || NO_INSTANCE}
                onValueChange={(v) => field.onChange(v === NO_INSTANCE ? "" : v)}
              >
                <SelectTrigger id="evolutionInstanceId">
                  <SelectValue>
                    {field.value ? selectedInstance?.nickname : "Sem instância"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INSTANCE}>Sem instância</SelectItem>
                  {evolutionInstances?.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      </div>

      <div className="space-y-4 rounded-xl border p-4 sm:col-span-2">
        <div>
          <h3 className="font-semibold">Recorrência</h3>
          <p className="text-sm text-muted-foreground">
            Repete o convite de calendário. Ative com o checkbox &quot;Enviar convite do
            evento&quot; ao compor a mensagem. Baseia-se no início do evento.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="recurrenceFreq">Frequência</Label>
            <Controller
              control={form.control}
              name="recurrenceFreq"
              render={({ field }) => (
                <Select
                  disabled={disabled}
                  value={field.value || NO_RECURRENCE}
                  onValueChange={(v) =>
                    field.onChange(v === NO_RECURRENCE ? "" : v)
                  }
                >
                  <SelectTrigger id="recurrenceFreq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RECURRENCE}>Não repetir</SelectItem>
                    {FREQ_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {isRecurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recurrenceInterval">A cada</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="recurrenceInterval"
                    type="number"
                    min={1}
                    disabled={disabled}
                    className="w-20"
                    {...register("recurrenceInterval")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {INTERVAL_UNIT[freq as string]}
                  </span>
                </div>
                {errors.recurrenceInterval && (
                  <p className="text-sm text-destructive">
                    {errors.recurrenceInterval.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrenceUntil">Repetir até</Label>
                <Controller
                  control={form.control}
                  name="recurrenceUntil"
                  render={({ field }) => (
                    <DateTimePicker
                      id="recurrenceUntil"
                      mode="datetime"
                      disabled={disabled}
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.recurrenceUntil && (
                  <p className="text-sm text-destructive">
                    {errors.recurrenceUntil.message}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
