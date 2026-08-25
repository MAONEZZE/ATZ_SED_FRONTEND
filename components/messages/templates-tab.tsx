"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useAllTemplates,
  useDeleteTemplateGlobal,
  useMoveTemplate,
} from "@/lib/api/global-messaging";
import { useEvent } from "@/lib/api/events";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";
import { arrayMove } from "@dnd-kit/sortable";
import type { Folder, MessageChannel, TemplateWithEvent } from "@/lib/api/types";
import { canWrite } from "@/lib/permissions";
import { ChannelBadge } from "@/components/messages/channel-badge";
import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { PageSizeSelect } from "@/components/common/page-size-select";
import { useSetRecordCount } from "@/components/common/record-count";
import { Button } from "@/components/ui/button";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function TemplateDragHandle({ id, disabled }: { id: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `template:${id}`,
    disabled,
  });
  if (disabled) return null;
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      aria-label="Arrastar template para reordenar ou mover para uma pasta"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function TemplateDropTarget({ id, name }: { id: string; name: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: `template:${id}` });
  return (
    <span ref={setNodeRef} className={isOver ? "rounded bg-accent px-1" : undefined}>
      {name}
    </span>
  );
}

/** Templates globais (`eventId=null`) ou estritamente pertencentes a um evento. */
export function TemplatesTab({ eventId }: { eventId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const folderScope = {
    resourceType: "message_template" as const,
    ...(eventId ? { eventId } : {}),
  };
  const { data: event } = useEvent(eventId ?? "");
  const writable = eventId === null || Boolean(event && canWrite(event));
  const { data: folderTree = [] } = useFolders(folderScope);
  const createFolder = useCreateFolder(folderScope);
  const renameFolder = useRenameFolder(folderScope);
  const deleteFolder = useDeleteFolder(folderScope);
  const reorderFolders = useReorderFolders(folderScope);
  const { data: response, isLoading } = useAllTemplates(
    page,
    pageSize,
    channelFilter === "all" ? undefined : channelFilter,
    eventId,
    folderId,
  );

  const templates = response?.data ?? [];
  useSetRecordCount(response?.total ?? 0);
  const deleteTemplate = useDeleteTemplateGlobal();
  const moveTemplate = useMoveTemplate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithEvent | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allFolders = flattenFolders(folderTree);
  const currentFolder = folderId
    ? allFolders.find((folder) => folder.id === folderId)
    : undefined;
  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  const breadcrumb = currentFolder ? folderPath(currentFolder, byId) : [];
  const folders = allFolders.filter((folder) => folder.parentId === (folderId ?? null));

  function openFolder(folder: { id: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("folderId", folder.id);
    setPage(1);
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToFolder(nextFolderId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFolderId) params.set("folderId", nextFolderId);
    else params.delete("folderId");
    setPage(1);
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!writable || !over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
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
      return;
    }
    if (!activeId.startsWith("template:")) return;
    const id = activeId.slice("template:".length);
    if (overId.startsWith("template:")) {
      const beforeId = beforeIdAfterMove(
        templates.map((template) => template.id),
        id,
        overId.slice("template:".length),
      );
      moveTemplate.mutate(
        { id, folderId, beforeId },
        { onError: (error) => toast.error(`Falha ao mover template: ${error.message}`) },
      );
      return;
    }
    const targetFolderId = overId.startsWith("folder:")
      ? overId.slice("folder:".length)
      : overId.startsWith("folder-content:")
        ? overId.slice("folder-content:".length)
        : folderId;
    moveTemplate.mutate(
      { id, folderId: targetFolderId },
      { onError: (error) => toast.error(`Falha ao mover template: ${error.message}`) },
    );
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const targets = templates.filter((t) => selected.has(t.id));
    const results = await Promise.allSettled(
      targets.map((t) => deleteTemplate.mutateAsync({ id: t.id })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} de ${targets.length} templates não puderam ser excluídos`);
    } else {
      toast.success(`${targets.length} template(s) excluído(s)`);
    }
    setSelected(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex h-9 items-center justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={channelFilter}
              onValueChange={(v) => {
                setChannelFilter(v as MessageChannel | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
            <PageSizeSelect
              value={pageSize}
              onChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {writable && (
              <>
                <FolderCreateButton
                  onCreate={(name) => createFolder.mutate({ name, parentId: folderId })}
                />
                <DataTableDeleteButton
                  selectedCount={selected.size}
                  isPending={bulkDeleting}
                  onDelete={() => setConfirmBulkDelete(true)}
                />
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo template
                </Button>
              </>
            )}
          </div>
        </div>

        {breadcrumb.length > 0 && (
          <nav
            aria-label="Caminho da pasta"
            className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => goToFolder(null)}
              className="hover:text-foreground"
            >
              Templates
            </button>
            {breadcrumb.map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <button
                  type="button"
                  onClick={() => goToFolder(folder.id)}
                  className="hover:text-foreground"
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        <FolderGrid
          folders={folders}
          basePath={pathname}
          onOpen={openFolder}
          onRename={(id, name) => renameFolder.mutate({ id, name })}
          onDelete={(id) => deleteFolder.mutate(id)}
          canEdit={writable}
        />

        <DataTable
          columns={[
            {
              key: "drag",
              header: "",
              className: "w-10",
              cell: (t) => <TemplateDragHandle id={t.id} disabled={!writable} />,
            },
            {
              key: "name",
              header: "Nome",
              align: "left",
              cell: (t) => <TemplateDropTarget id={t.id} name={t.name} />,
            },
            {
              key: "channel",
              header: "Canal",
              cell: (t) => <ChannelBadge channel={t.channel} />,
            },
          ]}
          data={templates}
          getRowId={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="Nenhum template ainda."
          onRowClick={
            writable
              ? (template) => {
                  setEditing(template);
                  setDialogOpen(true);
                }
              : undefined
          }
          selected={writable ? selected : undefined}
          onSelectedChange={writable ? setSelected : undefined}
          total={response?.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />

        <GlobalTemplateDialog
          template={editing}
          open={dialogOpen && writable}
          onOpenChange={setDialogOpen}
          fixedEventId={eventId ?? undefined}
          fixedFolderId={folderId}
        />

        <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selected.size} template(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Automações que usam esses templates podem parar de funcionar. Esta ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                disabled={bulkDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleBulkDelete();
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndContext>
  );
}

function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])]);
}

function folderPath(folder: Folder, byId: Map<string, Folder>): Folder[] {
  const path: Folder[] = [];
  let current: Folder | undefined = folder;
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
