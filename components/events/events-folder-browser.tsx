"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Folder as FolderIcon, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
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
import { canManage, canOrganize } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Pagination } from "@/components/common/data-table";
import { PageSizeSelect } from "@/components/common/page-size-select";
import { SortableEventCard } from "@/components/events/event-card";
import { EventDragOverlay } from "@/components/events/event-drag-overlay";
import { Button } from "@/components/ui/button";

function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])]);
}

function RootDropLink() {
  const { isOver, setNodeRef } = useDroppable({ id: "folder-root" });

  return (
    <Link
      ref={setNodeRef}
      href="/events"
      className={cn(
        "rounded px-1 py-0.5 hover:text-foreground",
        isOver && "bg-accent text-accent-foreground ring-2 ring-primary/40",
      )}
    >
      Eventos
    </Link>
  );
}

export function EventsFolderBrowser() {
  const { folderId } = useParams<{ folderId: string }>();
  const [activeEvent, setActiveEvent] = useState<EventObject | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const folderScope = { resourceType: "event" as const };
  const { data: folderTree = [], isLoading: foldersLoading } = useFolders(folderScope);
  const createFolder = useCreateFolder(folderScope);
  const renameFolder = useRenameFolder(folderScope);
  const deleteFolder = useDeleteFolder(folderScope);
  const reorderFolders = useReorderFolders(folderScope);
  const moveEvent = useMoveEvent();
  const { data: profile } = useProfile();
  const { data: response, isLoading: eventsLoading } = useEventsByFolder(
    page,
    pageSize,
    folderId,
  );
  const totalPages = response ? Math.max(1, Math.ceil(response.total / pageSize)) : 1;

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

  function handleDragStart({ active }: DragStartEvent) {
    const activeId = String(active.id);
    setActiveEvent(
      activeId.startsWith("event:")
        ? (events.find((event) => event.id === activeId.slice("event:".length)) ?? null)
        : null,
    );
  }

  function moveToFolder(event: EventObject, targetFolderId: string | null) {
    if (
      !canOrganize(event, profile?.id) ||
      event.status === "cancelled" ||
      event.status === "ended"
    ) {
      return;
    }
    moveEvent.mutate(
      { id: event.id, folderId: targetFolderId },
      { onError: (error) => toast.error(`Falha ao mover evento: ${error.message}`) },
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveEvent(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith("event:")) {
      const id = activeId.slice("event:".length);
      const event = events.find((item) => item.id === id);
      if (!event || !canManage(event, profile?.id)) return;

      if (overId === "folder-root") {
        moveToFolder(event, null);
        return;
      }
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
      moveToFolder(event, targetFolderId);
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveEvent(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <nav
              aria-label="Caminho da pasta"
              className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
            >
              <RootDropLink />
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
            <PageSizeSelect
              value={pageSize}
              onChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
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

        <FolderGrid
          folders={folders}
          basePath="/events"
          onRename={(id, name) => renameFolder.mutate({ id, name })}
          onDelete={(id) => deleteFolder.mutate(id)}
        />

        {eventsLoading ? (
          <LoadingSpinner />
        ) : events.length ? (
          <SortableContext
            items={events.map((event) => `event:${event.id}`)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <SortableEventCard key={event.id} event={event} ownerId={profile?.id} />
              ))}
            </div>
          </SortableContext>
        ) : folders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <FolderIcon className="mx-auto mb-3 h-10 w-10" />
            Esta pasta está vazia.
          </div>
        ) : null}

        <EventDragOverlay event={activeEvent} ownerId={profile?.id} />

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </DndContext>
  );
}
