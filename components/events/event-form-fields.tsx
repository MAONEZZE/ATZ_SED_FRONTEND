"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import type { EventFormValues } from "@/lib/validation/event-schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";

export function EventFormFields({
  form,
  disabled = false,
}: {
  form: UseFormReturn<EventFormValues>;
  disabled?: boolean;
}) {
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" disabled={disabled} {...register("title")} />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={4}
          disabled={disabled}
          {...register("description")}
        />
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
    </div>
  );
}
