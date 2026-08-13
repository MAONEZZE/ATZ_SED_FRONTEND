"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  ImageIcon,
  Link2,
  MapPin,
  MoreVertical,
  Plus,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useDeleteEvent, useDuplicateEvent, useEvents } from "@/lib/api/events";
import { useProfile } from "@/lib/api/profile";
import { CollaboratorsDialog } from "@/components/events/collaborators-dialog";
import type { EventObject } from "@/lib/api/types";
import { EventStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { FolderGroup } from "@/components/common/folder-group";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { useFolders } from "@/components/common/use-folders";
import { Badge } from "@/components/ui/badge";
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
    timeZone: "America/Sao_Paulo",
  });
}

function EventCard({
  event,
  ownerId,
}: {
  event: EventObject;
  ownerId: string | undefined;
}) {
  const router = useRouter();
  const duplicate = useDuplicateEvent();
  const deleteEvent = useDeleteEvent();
  const date = formatEventDate(event.eventDate);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`;
  const isShared = ownerId !== undefined && event.ownerId !== ownerId;
  const [collabOpen, setCollabOpen] = useState(false);

  function copyLink() {
    void navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  }

  function handleDuplicate() {
    duplicate.mutate(event.id, {
      onSuccess: (created) => {
        toast.success("Evento duplicado como rascunho");
        router.push(`/comunicacao/ex-eventos/${created.id}/edit`);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-video bg-muted">
          {event.coverUrl ? (
            <Image
              src={event.coverUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                  aria-label="Ações do evento"
                >
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
                <DropdownMenuItem onClick={() => setCollabOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Colaboradores
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
                        Isso apaga o evento, formulário, inscrições, templates, automações e
                        landing. Ação irreversível.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
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
          </div>
        </div>

        <CardContent className="p-4">
          <Link href={`/comunicacao/ex-eventos/${event.id}/edit`} className="block">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{event.title}</h3>
              <EventStatusBadge status={event.status} />
              {isShared && (
                <Badge variant="outline" className="text-xs">
                  Compartilhado
                </Badge>
              )}
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
        </CardContent>
      </Card>

      <CollaboratorsDialog
        eventId={event.id}
        ownerId={event.ownerId}
        open={collabOpen}
        onOpenChange={setCollabOpen}
      />
    </>
  );
}

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: profile } = useProfile();
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();
  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useEvents(page, limit);
  const events = response?.data;
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Comunicação" }, { label: "Externo" }, { label: "Eventos" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <div className="flex items-center gap-2">
          <FolderCreateButton onCreate={createFolder} />
          <Button asChild>
            <Link href="/comunicacao/ex-eventos/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo evento
            </Link>
          </Button>
        </div>
      </div>

      <FolderGrid
        folders={folders}
        basePath="/comunicacao/ex-eventos"
        onRename={renameFolder}
        onDelete={deleteFolder}
      />

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

      {response && events?.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Nenhum evento ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro evento para começar.
          </p>
          <Button asChild className="mt-4">
            <Link href="/comunicacao/ex-eventos/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar evento
            </Link>
          </Button>
        </div>
      )}

      {events && events.length > 0 && (
        <FolderGroup title="Eventos" count={response?.total}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} ownerId={profile?.id} />
            ))}
          </div>
        </FolderGroup>
      )}

      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
