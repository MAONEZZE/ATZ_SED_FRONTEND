"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Plus } from "lucide-react";
import { ALL_EVENTS_LIMIT, useEventsByFolder, useMoveEvent } from "@/lib/api/events";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useProfile } from "@/lib/api/profile";
import type { EventObject } from "@/lib/api/types";
import { canManage, canOrganize } from "@/lib/permissions";
import { SortableEventCard } from "@/components/events/event-card";
import { EventDragOverlay } from "@/components/events/event-drag-overlay";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { Pagination } from "@/components/common/data-table";
import { DEFAULT_PAGE_SIZE, PageSizeSelect } from "@/components/common/page-size-select";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";
import { paginateFoldersAndItems } from "@/lib/utils/paginate-folders";
import { folderAwareCollision } from "@/lib/utils/folder-collision";
import { Button } from "@/components/ui/button";

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [activeEvent, setActiveEvent] = useState<EventObject | null>(null);
  const { data: profile } = useProfile();
  const folderScope = { resourceType: "event" as const };
  const { data: folderTree = [] } = useFolders(folderScope);
  const createFolder = useCreateFolder(folderScope);
  const renameFolder = useRenameFolder(folderScope);
  const deleteFolder = useDeleteFolder(folderScope);
  const reorderFolders = useReorderFolders(folderScope);
  const moveFolder = useMoveFolder(folderScope);
  const moveEvent = useMoveEvent();
  const allFolders = folderTree.filter((folder) => folder.parentId === null);
  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useEventsByFolder(1, ALL_EVENTS_LIMIT, null);
  // Pastas e eventos ocupam as mesmas vagas da página.
  const {
    folders,
    items: events,
    total,
  } = paginateFoldersAndItems(allFolders, response?.data ?? [], page, pageSize);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleDragStart({ active }: DragStartEvent) {
    const activeId = String(active.id);
    setActiveEvent(
      activeId.startsWith("event:")
        ? (events.find((event) => event.id === activeId.slice("event:".length)) ?? null)
        : null,
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
      if (
        targetFolderId === undefined ||
        !canOrganize(event, profile?.id) ||
        event.status === "cancelled" ||
        event.status === "ended"
      ) {
        return;
      }
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
      // Mudar de nível é PATCH na pasta: `/reorder` só reescreve `order` e ignora
      // id que não é irmão do `parentId` enviado.
      moveFolder.mutate(
        { id: source, parentId: target },
        { onError: (error) => toast.error(`Falha ao mover pasta: ${error.message}`) },
      );
      return;
    }

    if (activeId.startsWith("folder:") && overId.startsWith("folder:")) {
      const source = activeId.slice("folder:".length);
      const target = overId.slice("folder:".length);
      const current = allFolders.map((folder) => folder.id);
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
          <PageSizeSelect
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
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
        collisionDetection={folderAwareCollision}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveEvent(null)}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

            {response && total === 0 && (
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

        <EventDragOverlay event={activeEvent} ownerId={profile?.id} />
      </DndContext>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
