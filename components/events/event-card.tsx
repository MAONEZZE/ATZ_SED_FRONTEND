"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  FolderInput,
  ImageIcon,
  Link2,
  MapPin,
  MoreVertical,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDeleteEvent, useDuplicateEvent, useMoveEvent } from "@/lib/api/events";
import { useFolders } from "@/lib/api/folders";
import type { EventObject, Folder } from "@/lib/api/types";
import { canManage, canOrganize, canWrite } from "@/lib/permissions";
import { CollaboratorsDialog } from "@/components/events/collaborators-dialog";
import { EventStatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])]);
}

export function EventCard({
  event,
  ownerId,
}: {
  event: EventObject;
  ownerId: string | undefined;
}) {
  const router = useRouter();
  const duplicate = useDuplicateEvent();
  const deleteEvent = useDeleteEvent();
  const moveEvent = useMoveEvent();
  const { data: folderTree = [] } = useFolders({ resourceType: "event" });
  const folders = flattenFolders(folderTree);
  const date = formatEventDate(event.eventDate);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`;
  const isShared = ownerId !== undefined && event.ownerId !== ownerId;
  const writable = canWrite(event);
  const organizable = canOrganize(event, ownerId);
  const statusAllowsMove = event.status !== "cancelled" && event.status !== "ended";
  const canMoveToFolder = writable && organizable && statusAllowsMove;
  const moveDisabledReason = !writable
    ? "Leitores não podem mover eventos"
    : !organizable
      ? "Apenas o dono pode organizar este evento em pastas"
      : !statusAllowsMove
        ? "Eventos cancelados ou encerrados não podem ser movidos"
        : undefined;
  const [collabOpen, setCollabOpen] = useState(false);

  function copyLink() {
    void navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  }

  function handleDuplicate() {
    if (!writable) return;
    duplicate.mutate(event.id, {
      onSuccess: (created) => {
        toast.success("Evento duplicado como rascunho");
        router.push(`/events/${created.id}/edit`);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleMove(folderId: string | null) {
    if (!canMoveToFolder || event.folderId === folderId) return;
    moveEvent.mutate(
      { id: event.id, folderId },
      {
        onSuccess: () => toast.success("Evento movido"),
        onError: (error) => toast.error(`Falha ao mover evento: ${error.message}`),
      },
    );
  }

  return (
    <>
      <Card className="flex h-[260px] flex-col overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative h-[180px] shrink-0 bg-muted">
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
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={!writable || duplicate.isPending}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
                {canMoveToFolder ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Mover para
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        disabled={event.folderId === null}
                        onClick={() => handleMove(null)}
                      >
                        Sem pasta
                      </DropdownMenuItem>
                      {folders.length > 0 && <DropdownMenuSeparator />}
                      {folders.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          disabled={event.folderId === folder.id}
                          onClick={() => handleMove(folder.id)}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <div title={moveDisabledReason}>
                    <DropdownMenuItem disabled>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Mover para
                    </DropdownMenuItem>
                  </div>
                )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      disabled={!writable}
                      onSelect={(selectEvent) => selectEvent.preventDefault()}
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
                        Isso apaga o evento, formulário, inscrições, templates, automações
                        e landing. Ação irreversível.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                        onClick={() =>
                          deleteEvent.mutate(event.id, {
                            onSuccess: () => toast.success("Evento excluído"),
                            onError: (error) => toast.error(error.message),
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

        <CardContent className="min-h-0 flex-1 overflow-hidden p-3">
          <Link href={`/events/${event.id}/edit`} className="block">
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

      <CollaboratorsDialog event={event} open={collabOpen} onOpenChange={setCollabOpen} />
    </>
  );
}

export function SortableEventCard({
  event,
  ownerId,
}: {
  event: EventObject;
  ownerId?: string;
}) {
  const suppressClickRef = useRef(false);
  const movable = canManage(event, ownerId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `event:${event.id}`,
      disabled: !movable,
    });

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
      return;
    }
    if (!suppressClickRef.current) return;
    const timeout = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isDragging]);

  function handleClickCapture(clickEvent: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    suppressClickRef.current = false;
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-40" : "relative"}
      onClickCapture={handleClickCapture}
      {...attributes}
      {...listeners}
    >
      <EventCard event={event} ownerId={ownerId} />
    </div>
  );
}
