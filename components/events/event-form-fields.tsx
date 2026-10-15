"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventFormValues } from "@/lib/validation/event-schema";
import { normalizeSlugInput, publicEventUrl, slugFromTitle } from "@/lib/utils/slug";
import { useWhatsAppInstances } from "@/lib/api/whatsapp-instances";
import { InstanceStatusBadge } from "@/components/common/status-badge";
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
  suggestSlug = false,
}: {
  form: UseFormReturn<EventFormValues>;
  disabled?: boolean;
  /** Na criação, o slug acompanha o título até o usuário editar o campo. */
  suggestSlug?: boolean;
}) {
  const { register, formState } = form;
  const errors = formState.errors;
  const title = form.watch("title");
  const slug = form.watch("slug");
  const slugEdited = useRef(false);

  useEffect(() => {
    if (suggestSlug && !slugEdited.current) {
      form.setValue("slug", slugFromTitle(title ?? ""));
    }
  }, [suggestSlug, title, form]);

  // A URL é absoluta, então a origem só existe no cliente.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const freq = form.watch("recurrenceFreq");
  const isRecurring = Boolean(freq);
  const { data: whatsappInstances } = useWhatsAppInstances();

  // erro dentro de secao fechada seria invisivel: abre a secao que tem erro.
  const advancedHasError = Boolean(errors.endDate || errors.capacity);
  const messagingHasError = Boolean(
    errors.groupLink || errors.recurrenceInterval || errors.recurrenceUntil,
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" disabled={disabled} {...register("title")} />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug / URL do evento</Label>
        <Controller
          control={form.control}
          name="slug"
          render={({ field }) => (
            <Input
              id="slug"
              disabled={disabled}
              placeholder={
                suggestSlug ? "Deixe em branco para gerar automaticamente" : undefined
              }
              aria-describedby="slug-preview"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onChange={(e) => {
                slugEdited.current = true;
                field.onChange(normalizeSlugInput(e.target.value));
              }}
            />
          )}
        />
        <p id="slug-preview" className="break-all text-sm text-muted-foreground">
          {slug
            ? publicEventUrl(origin, slug)
            : suggestSlug
              ? "Em branco: o endereço é gerado automaticamente a partir do título."
              : "Em branco: o endereço atual é mantido."}
        </p>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <Section title="Avançado" hasError={advancedHasError}>
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
      </Section>

      <Section title="Mensageria" hasError={messagingHasError}>
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
          <Label htmlFor="whatsappInstanceId">Instância</Label>
          <Controller
            control={form.control}
            name="whatsappInstanceId"
            render={({ field }) => {
              const [selectedInstance] =
                whatsappInstances?.filter((instance) => instance.id === field.value) ??
                [];
              return (
                <Select
                  disabled={disabled}
                  value={field.value || NO_INSTANCE}
                  onValueChange={(v) => field.onChange(v === NO_INSTANCE ? "" : v)}
                >
                  <SelectTrigger id="whatsappInstanceId">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        {field.value ? selectedInstance?.nickname : "Sem instância"}
                        {field.value && selectedInstance && (
                          <InstanceStatusBadge active={selectedInstance.active} />
                        )}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_INSTANCE}>Sem instância</SelectItem>
                    {whatsappInstances?.map((instance) => (
                      <SelectItem
                        key={instance.id}
                        value={instance.id}
                        disabled={!instance.active}
                      >
                        <span className="flex items-center gap-2">
                          {instance.nickname}
                          <InstanceStatusBadge active={instance.active} />
                        </span>
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
            <h3 className="font-semibold">Recorrência - Invite e-mail</h3>
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
                    onValueChange={(v) => field.onChange(v === NO_RECURRENCE ? "" : v)}
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
      </Section>
    </div>
  );
}

/** Bloco recolhivel de campos secundarios do evento. */
function Section({
  title,
  hasError,
  children,
}: {
  title: string;
  hasError: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasError) setOpen(true);
  }, [hasError]);

  return (
    <div className="rounded-xl border bg-card text-card-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          {title}
          {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="grid gap-5 border-t p-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}
