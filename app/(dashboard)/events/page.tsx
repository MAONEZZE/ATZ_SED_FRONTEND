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
import {
  useDeleteEvent,
  useDuplicateEvent,
  useEvents,
  useMoveEvent,
} from "@/lib/api/events";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProfile } from "@/lib/api/profile";
import { CollaboratorsDialog } from "@/components/events/collaborators-dialog";
import type { EventObject } from "@/lib/api/types";
import { EventStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { Pagination } from "@/components/common/data-table";
import { RESERVED_BELOW, useFitPageSize } from "@/components/common/use-fit-page-size";
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
        router.push(`/events/${created.id}/edit`);
      },
      onError: (e) => toast.error(e.message),
    });
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
                  disabled={duplicate.isPending}
                >
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

      <CollaboratorsDialog
        eventId={event.id}
        ownerId={event.ownerId}
        open={collabOpen}
        onOpenChange={setCollabOpen}
      />
    </>
  );
}

function SortableEventCard({ event, ownerId }: { event: EventObject; ownerId?: string }) {
  const canMove = event.myRole === "admin" || event.ownerId === ownerId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `event:${event.id}`,
      disabled: !canMove,
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "z-10 opacity-60" : undefined}
      {...attributes}
      {...listeners}
    >
      <EventCard event={event} ownerId={ownerId} />
    </div>
  );
}

/** Altura fixa do EventCard (`h-[260px]`) — a medição depende dela ser constante. */
const EVENT_CARD_HEIGHT = 260;
/** `gap-4` do grid. */
const GRID_GAP = 16;

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const { data: profile } = useProfile();
  const folderScope = { resourceType: "event" as const };
  const { data: folderTree = [] } = useFolders(folderScope);
  const createFolder = useCreateFolder(folderScope);
  const renameFolder = useRenameFolder(folderScope);
  const deleteFolder = useDeleteFolder(folderScope);
  const reorderFolders = useReorderFolders(folderScope);
  const moveEvent = useMoveEvent();
  const folders = folderTree.filter((folder) => folder.parentId === null);
  // O grid é medido vazio; o fetch só dispara com a quantidade que cabe na tela.
  // Todos os estados (carregando, erro, vazio) ficam DENTRO dele, senão o topo
  // do grid se desloca a cada troca de estado e a medição oscila.
  const { ref: gridRef, pageSize } = useFitPageSize<HTMLDivElement>({
    itemHeight: EVENT_CARD_HEIGHT,
    gap: GRID_GAP,
    reserved: RESERVED_BELOW,
  });
  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useEvents(page, pageSize ?? 0, null);
  const events = response?.data ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const totalPages = pageSize && response ? Math.ceil(response.total / pageSize) : 0;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("event:")) {
      const id = activeId.slice("event:".length);
      const event = events.find((item) => item.id === id);
      if (!event || (event.myRole !== "admin" && event.ownerId !== profile?.id)) return;
      const targetFolderId = overId.startsWith("folder:")
        ? overId.slice("folder:".length)
        : overId.startsWith("folder-content:")
          ? overId.slice("folder-content:".length)
          : null;
      const beforeId = overId.startsWith("event:")
        ? overId.slice("event:".length)
        : undefined;
      moveEvent.mutate(
        { id, folderId: targetFolderId, beforeId },
        { onError: (error) => toast.error(`Falha ao mover evento: ${error.message}`) },
      );
      return;
    }

    if (activeId.startsWith("folder:") && overId.startsWith("folder-content:")) {
      const source = activeId.slice("folder:".length);
      const target = overId.slice("folder-content:".length);
      if (source === target) return;
      const targetFolder = folderTree.find((folder) => folder.id === target);
      reorderFolders.mutate(
        {
          ids: [...(targetFolder?.children.map((folder) => folder.id) ?? []), source],
          parentId: target,
        },
        { onError: (error) => toast.error(`Falha ao mover pasta: ${error.message}`) },
      );
      return;
    }

    if (activeId.startsWith("folder:") && overId.startsWith("folder:")) {
      const source = activeId.slice("folder:".length);
      const target = overId.slice("folder:".length);
      const current = folders.map((folder) => folder.id);
      const next = arrayMove(current, current.indexOf(source), current.indexOf(target));
      reorderFolders.mutate(
        { ids: next, parentId: null },
        {
          onError: (error) => toast.error(`Falha ao reordenar pastas: ${error.message}`),
        },
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <div className="flex items-center gap-2">
          <FolderCreateButton onCreate={(name) => createFolder.mutate({ name })} />
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo evento
            </Link>
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <FolderGrid
          folders={folders}
          basePath="/events"
          onRename={(id, name) => renameFolder.mutate({ id, name })}
          onDelete={(id) => deleteFolder.mutate(id)}
        />

        <SortableContext
          items={events.map((event) => `event:${event.id}`)}
          strategy={rectSortingStrategy}
        >
          <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && (
              <div className="col-span-full">
                <LoadingSpinner />
              </div>
            )}

            {isError && (
              <div className="col-span-full rounded-xl border border-dashed p-12 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">
                  Não foi possível carregar os eventos
                </h2>
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
              <div className="col-span-full rounded-xl border border-dashed p-12 text-center">
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

            {events.map((event) => (
              <SortableEventCard key={event.id} event={event} ownerId={profile?.id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
