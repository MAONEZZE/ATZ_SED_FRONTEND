"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Rocket, Square } from "lucide-react";
import { useEvent, useUpdateEvent, useUpdateEventStatus } from "@/lib/api/events";
import { useWhatsAppInstances } from "@/lib/api/whatsapp-instances";
import {
  eventSchema,
  toEventInput,
  type EventFormValues,
} from "@/lib/validation/event-schema";
import { APP_TIME_ZONE, utcIsoToZonedInput } from "@/lib/utils/date-time-picker";
import { canTransitionEvent } from "@/lib/utils/transition-maps";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import { publicEventUrl, slugErrorFromApi } from "@/lib/utils/slug";
import { EventFormFields } from "@/components/events/event-form-fields";
import { CancelEventDialog } from "@/components/events/cancel-event-dialog";
import { CoverUploader } from "@/components/events/cover-uploader";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { EventUpdateInput } from "@/lib/api/events";
import type { EventObject } from "@/lib/api/types";

function toFormValues(event: EventObject): EventFormValues {
  return {
    title: event.title,
    slug: event.slug,
    location: event.location ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    dressCode: event.dressCode ?? "",
    groupLink: event.groupLink ?? "",
    eventDate: event.eventDate ? utcIsoToZonedInput(event.eventDate, APP_TIME_ZONE) : "",
    endDate: event.endDate ? utcIsoToZonedInput(event.endDate, APP_TIME_ZONE) : "",
    recurrenceFreq: event.recurrenceFreq ?? "",
    recurrenceInterval:
      event.recurrenceInterval != null ? String(event.recurrenceInterval) : "",
    recurrenceUntil: event.recurrenceUntil
      ? utcIsoToZonedInput(event.recurrenceUntil, APP_TIME_ZONE)
      : "",
    whatsappInstanceId: event.whatsappInstanceId ?? "",
  };
}

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(params.id);
  const { data: whatsappInstances } = useWhatsAppInstances();
  const updateEvent = useUpdateEvent(params.id);
  const updateStatus = useUpdateEventStatus(params.id);
  // Payload aguardando o "Deseja continuar?" da troca de slug.
  const [pendingSlugChange, setPendingSlugChange] = useState<EventUpdateInput | null>(
    null,
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    if (event) form.reset(toFormValues(event));
  }, [event, form]);

  // A instância selecionada só é aplicada depois que a lista de instâncias já
  // carregou numa render anterior: setar junto com o carregamento da lista faz
  // o <Select> do Radix perder o valor (corrida interna ao registrar as options).
  const [instancesReady, setInstancesReady] = useState(false);
  useEffect(() => {
    if (whatsappInstances) setInstancesReady(true);
  }, [whatsappInstances]);

  useEffect(() => {
    if (event && instancesReady) {
      form.setValue("whatsappInstanceId", event.whatsappInstanceId ?? "");
    }
  }, [event, instancesReady, form]);

  const readonly = useMemo(
    () => event?.status === "cancelled" || event?.status === "ended",
    [event?.status],
  );

  if (isLoading || !event) return <LoadingSpinner />;

  const isDirty = form.formState.isDirty;

  function onSave(values: EventFormValues) {
    // Só manda o slug quando mudou: vazio ou igual ao atual mantém o slug.
    const { slug, ...rest } = toEventInput(values);
    if (slug && slug !== event!.slug) {
      setPendingSlugChange({ ...rest, slug });
      return;
    }
    save(rest);
  }

  function save(input: EventUpdateInput) {
    const previousSlug = event!.slug;
    updateEvent.mutate(input, {
      onSuccess: (updated) => {
        form.reset(toFormValues(updated));
        revalidatePublicEvent(updated.slug);
        // A página do slug antigo não pode continuar servida pelo cache.
        if (updated.slug !== previousSlug) revalidatePublicEvent(previousSlug);
        toast.success("Evento salvo!");
      },
      onError: (e) => {
        const slugError = slugErrorFromApi(e);
        if (slugError) {
          form.setError("slug", { message: slugError }, { shouldFocus: true });
          return;
        }
        toast.error(e.message);
      },
    });
  }

  function confirmSlugChange() {
    if (pendingSlugChange) save(pendingSlugChange);
    setPendingSlugChange(null);
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

      <AlertDialog
        open={pendingSlugChange !== null}
        onOpenChange={(open) => !open && setPendingSlugChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar o endereço do evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao alterar o slug, o link atual (
              <span className="break-all font-medium text-foreground">
                {publicEventUrl(window.location.origin, event.slug)}
              </span>
              ) deixará de funcionar. Links, QR codes e formulários já divulgados
              precisarão ser atualizados. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {event.status === "published" && (
            <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
              Este evento está publicado: quem acessar o link antigo verá uma página
              não encontrada.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSlugChange}>
              Alterar slug e salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
