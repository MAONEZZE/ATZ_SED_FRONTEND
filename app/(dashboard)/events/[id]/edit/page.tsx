"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Rocket, Square } from "lucide-react";
import { useEvent, useUpdateEvent, useUpdateEventStatus } from "@/lib/api/events";
import {
  eventSchema,
  toEventInput,
  type EventFormValues,
} from "@/lib/validation/event-schema";
import { canTransitionEvent } from "@/lib/utils/transition-maps";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import { EventFormFields } from "@/components/events/event-form-fields";
import { CancelEventDialog } from "@/components/events/cancel-event-dialog";
import { CoverUploader } from "@/components/events/cover-uploader";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import type { EventObject } from "@/lib/api/types";

function utcIsoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toFormValues(event: EventObject): EventFormValues {
  return {
    title: event.title,
    location: event.location ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    dressCode: event.dressCode ?? "",
    groupLink: event.groupLink ?? "",
    eventDate: event.eventDate ? utcIsoToLocalInput(event.eventDate) : "",
    endDate: event.endDate ? utcIsoToLocalInput(event.endDate) : "",
    recurrenceFreq: event.recurrenceFreq ?? "",
    recurrenceInterval:
      event.recurrenceInterval != null ? String(event.recurrenceInterval) : "",
    recurrenceUntil: event.recurrenceUntil
      ? utcIsoToLocalInput(event.recurrenceUntil)
      : "",
  };
}

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(params.id);
  const updateEvent = useUpdateEvent(params.id);
  const updateStatus = useUpdateEventStatus(params.id);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    if (event) form.reset(toFormValues(event));
  }, [event, form]);

  const readonly = useMemo(
    () => event?.status === "cancelled" || event?.status === "ended",
    [event?.status],
  );

  if (isLoading || !event) return <LoadingSpinner />;

  const isDirty = form.formState.isDirty;

  function onSave(values: EventFormValues) {
    updateEvent.mutate(toEventInput(values), {
      onSuccess: (updated) => {
        form.reset(toFormValues(updated));
        revalidatePublicEvent(updated.slug);
        toast.success("Evento salvo!");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function changeStatus(status: "published" | "ended") {
    updateStatus.mutate(status, {
      onSuccess: () => {
        revalidatePublicEvent(event!.slug);
        toast.success(status === "published" ? "Evento publicado!" : "Evento encerrado.");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        {readonly && (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
            Evento {event.status === "cancelled" ? "cancelado" : "encerrado"} — somente
            leitura.
          </p>
        )}

        <EventFormFields form={form} disabled={readonly} />

        {!readonly && (
          <div className="flex flex-wrap items-center gap-3">
            {canTransitionEvent(event.status, "ended") && (
              <Button
                type="button"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => changeStatus("ended")}
              >
                <Square className="mr-2 h-4 w-4" />
                Encerrar evento
              </Button>
            )}
            {canTransitionEvent(event.status, "cancelled") && (
              <CancelEventDialog eventId={event.id} slug={event.slug} />
            )}
            <Button
              type="submit"
              className="ml-auto"
              disabled={!isDirty || updateEvent.isPending}
            >
              {updateEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        )}
      </form>

      <aside className="space-y-6">
        <CoverUploader
          eventId={event.id}
          slug={event.slug}
          coverUrl={event.coverUrl}
          updatedAt={event.updatedAt}
          disabled={readonly}
        />

        {canTransitionEvent(event.status, "published") && (
          <div className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Status</h3>
            <Button
              type="button"
              className="w-full"
              disabled={updateStatus.isPending}
              onClick={() => changeStatus("published")}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Publicar
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
