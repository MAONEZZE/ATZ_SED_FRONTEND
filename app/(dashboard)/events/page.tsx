"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  MoreVertical,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useDeleteEvent, useDuplicateEvent, useEvents } from "@/lib/api/events";
import type { EventObject } from "@/lib/api/types";
import { EventStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventCard({ event }: { event: EventObject }) {
  const router = useRouter();
  const duplicate = useDuplicateEvent();
  const deleteEvent = useDeleteEvent();
  const date = formatEventDate(event.eventDate);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`;

  function copyLink() {
    void navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  }

  function handleDuplicate() {
    duplicate.mutate(event.id, {
      onSuccess: (created) => {
        toast.success("Evento duplicado como rascunho");
        router.push(`/events/${created.id}/edit`);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-4">
        <Link href={`/events/${event.id}/edit`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{event.title}</h3>
            <EventStatusBadge status={event.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {date}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </span>
            )}
            {event.capacity && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {event.capacity}
              </span>
            )}
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ações do evento">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {event.status === "published" && (
              <DropdownMenuItem asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver página pública
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyLink}>
              <Link2 className="mr-2 h-4 w-4" />
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} disabled={duplicate.isPending}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso apaga o evento, formulário, inscrições, templates,
                    automações e landing. Ação irreversível.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      deleteEvent.mutate(event.id, {
                        onSuccess: () => toast.success("Evento excluído"),
                        onError: (e) => toast.error(e.message),
                      })
                    }
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const { data: events, isLoading, isError, refetch, isRefetching } = useEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <Button asChild>
          <Link href="/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo evento
          </Link>
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Não foi possível carregar os eventos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {events && events.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Nenhum evento ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro evento para começar.
          </p>
          <Button asChild className="mt-4">
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar evento
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {events?.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}
