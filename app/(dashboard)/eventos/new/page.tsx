"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCreateEvent } from "@/lib/api/events";
import {
  eventSchema,
  toEventInput,
  type EventFormValues,
} from "@/lib/validation/event-schema";
import { EventFormFields } from "@/components/events/event-form-fields";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { EventObject } from "@/lib/api/types";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";

export default function NewEventPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const [publishing, setPublishing] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "" },
  });

  async function submit(values: EventFormValues, publish: boolean) {
    setPublishing(publish);
    createEvent.mutate(toEventInput(values), {
      onSuccess: async (event) => {
        if (publish) {
          try {
            await api.patch<EventObject>(`/events/${event.id}/status`, {
              status: "published",
            });
            revalidatePublicEvent(event.slug);
            toast.success("Evento criado e publicado!");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? `Evento criado como rascunho, falha ao publicar: ${error.message}`
                : "Evento criado como rascunho, falha ao publicar",
            );
          }
        } else {
          toast.success("Rascunho criado");
        }
        router.push(`/eventos/${event.id}/edit`);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  const isPending = createEvent.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Eventos", href: "/eventos" },
          { label: "Novo evento" },
        ]}
      />
      <h1 className="text-2xl font-bold tracking-tight">Novo evento</h1>

      <form className="space-y-6">
        <EventFormFields form={form} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => router.push("/eventos")}
          >
            Cancelar
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={form.handleSubmit((v) => submit(v, false))}
            >
              {isPending && !publishing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={form.handleSubmit((v) => submit(v, true))}
            >
              {isPending && publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e publicar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
