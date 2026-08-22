"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Folder as FolderIcon, ImageIcon, Plus } from "lucide-react";
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
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEventsByFolder, useMoveEvent } from "@/lib/api/events";
import { useProfile } from "@/lib/api/profile";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";
import type { EventObject, Folder } from "@/lib/api/types";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/common/status-badge";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";

function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])]);
}

function SortableFolderEvent({
  event,
  ownerId,
}: {
  event: EventObject;
  ownerId?: string;
}) {
  const suppressClickRef = useRef(false);
  const canMove = event.myRole === "admin" || event.ownerId === ownerId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `event:${event.id}`,
      disabled: !canMove,
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
      className={isDragging ? "z-10 opacity-60" : undefined}
      onClickCapture={handleClickCapture}
      {...attributes}
      {...listeners}
    >
      <Link href={`/events/${event.id}/edit`} className="block">
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
          </div>
          <CardContent className="min-h-0 flex-1 space-y-2 overflow-hidden p-3">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-semibold">{event.title}</h2>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {event.location ?? "Sem local definido"}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export function EventsFolderBrowser() {
  const { folderId } = useParams<{ folderId: string }>();
  const folderScope = { resourceType: "event" as const };
  const { data: folderTree = [], isLoading: foldersLoading } = useFolders(folderScope);
  const createFolder = useCreateFolder(folderScope);
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const reorderFolders = useReorderFolders(folderScope);
  const moveEvent = useMoveEvent();
  const { data: profile } = useProfile();
  const { data: response, isLoading: eventsLoading } = useEventsByFolder(
    1,
    50,
    folderId,
  );

  const allFolders = flattenFolders(folderTree);
  const current = allFolders.find((folder) => folder.id === folderId);
  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  const breadcrumb = current
    ? (() => {
        const path: Folder[] = [];
        let next: Folder | undefined = current;
        while (next) {
          path.unshift(next);
          next = next.parentId ? byId.get(next.parentId) : undefined;
        }
        return path;
      })()
    : [];
  const folders = allFolders.filter((folder) => folder.parentId === folderId);
  const events = response?.data ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith("event:")) {
      const id = activeId.slice("event:".length);
      const event = events.find((item) => item.id === id);
      if (!event || (event.myRole !== "admin" && event.ownerId !== profile?.id)) return;
      if (overId.startsWith("event:")) {
        const beforeId = beforeIdAfterMove(
          events.map((item) => item.id),
          id,
          overId.slice("event:".length),
        );
        moveEvent.mutate(
          { id, ...(beforeId ? { beforeId } : {}) },
          { onError: (error) => toast.error(`Falha ao mover evento: ${error.message}`) },
        );
        return;
      }
      const targetFolderId = overId.startsWith("folder:")
        ? overId.slice("folder:".length)
        : overId.startsWith("folder-content:")
          ? overId.slice("folder-content:".length)
          : undefined;
      if (targetFolderId === undefined) return;
      moveEvent.mutate(
        { id, folderId: targetFolderId },
        { onError: (error) => toast.error(`Falha ao mover evento: ${error.message}`) },
      );
      return;
    }
    if (activeId.startsWith("folder:") && overId.startsWith("folder-content:")) {
      const source = activeId.slice("folder:".length);
      const target = overId.slice("folder-content:".length);
      if (source === target) return;
      const targetFolder = allFolders.find((folder) => folder.id === target);
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
      const ids = folders.map((folder) => folder.id);
      reorderFolders.mutate(
        {
          ids: arrayMove(ids, ids.indexOf(source), ids.indexOf(target)),
          parentId: folderId,
        },
        {
          onError: (error) => toast.error(`Falha ao reordenar pastas: ${error.message}`),
        },
      );
    }
  }

  if (!foldersLoading && !current) {
    return <p className="text-sm text-muted-foreground">Pasta não encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav
            aria-label="Caminho da pasta"
            className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <Link href="/events" className="hover:text-foreground">
              Eventos
            </Link>
            {breadcrumb.map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                  href={`/events/folder/${folder.id}?nome=${encodeURIComponent(folder.name)}`}
                  className="hover:text-foreground"
                >
                  {folder.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">
            {current?.name ?? "Pasta"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <FolderCreateButton
            onCreate={(name) => createFolder.mutate({ name, parentId: folderId })}
          />
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
          {eventsLoading ? (
            <LoadingSpinner />
          ) : events.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <SortableFolderEvent key={event.id} event={event} ownerId={profile?.id} />
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <FolderIcon className="mx-auto mb-3 h-10 w-10" />
              Esta pasta está vazia.
            </div>
          ) : null}
        </SortableContext>
      </DndContext>
    </div>
  );
}
