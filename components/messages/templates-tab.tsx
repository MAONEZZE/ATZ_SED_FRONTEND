"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  useAllTemplates,
  useDeleteTemplateGlobal,
  useMoveTemplate,
  useTemplatesInFolders,
} from "@/lib/api/global-messaging";
import { useEvent } from "@/lib/api/events";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
  useReorderFolders,
} from "@/lib/api/folders";
import { arrayMove } from "@dnd-kit/sortable";
import type { Folder, MessageChannel, TemplateWithEvent } from "@/lib/api/types";
import { canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "@/components/messages/channel-badge";
import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { DEFAULT_PAGE_SIZE, PageSizeSelect } from "@/components/common/page-size-select";
import { useSetRecordCount } from "@/components/common/record-count";
import { Button } from "@/components/ui/button";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderDeleteAlert } from "@/components/common/folder-delete-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";
import { folderAwareCollision } from "@/lib/utils/folder-collision";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from "@/components/ui/alert-dialog";

/** Uma linha da tabela: pasta (abre/fecha) ou template. `depth` dá o recuo. */
type TemplateRow =
  | { kind: "folder"; id: string; depth: number; folder: Folder }
  | { kind: "template"; id: string; depth: number; template: TemplateWithEvent };

const INDENT_PER_LEVEL = 20;

/** Id do alvo de arraste da linha — `folder:` reordena, `template:` reordena/entra. */
function dropIdFor(row: TemplateRow): string {
  return row.kind === "folder" ? `folder:${row.folder.id}` : `template:${row.template.id}`;
}

function DragHandle({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function TemplateNameCell({
  template,
  depth,
}: {
  template: TemplateWithEvent;
  depth: number;
}) {
  const { setNodeRef } = useDroppable({ id: `template:${template.id}` });
  return (
    <div className="flex items-center" style={{ paddingLeft: depth * INDENT_PER_LEVEL }}>
      {/* A linha inteira acende pelo `rowClassName` da tabela. */}
      <span ref={setNodeRef} className="truncate px-1">
        {template.name}
      </span>
    </div>
  );
}

function FolderNameCell({
  folder,
  depth,
  expanded,
}: {
  folder: Folder;
  depth: number;
  expanded: boolean;
}) {
  // A linha inteira reordena (`folder:`); o miolo com ícone e nome aninha
  // dentro da pasta (`folder-content:`), como nos cards de pasta.
  const { setNodeRef } = useDroppable({ id: `folder:${folder.id}` });
  const { isOver: isOverContent, setNodeRef: setContentRef } = useDroppable({
    id: `folder-content:${folder.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1"
      style={{ paddingLeft: depth * INDENT_PER_LEVEL }}
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span
        ref={setContentRef}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded px-1",
          isOverContent && "bg-accent ring-2 ring-primary/40",
        )}
      >
        <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{folder.name}</span>
      </span>
    </div>
  );
}

/** Alvo para tirar um template de dentro de uma pasta. */
function RootDropTarget() {
  const { isOver, setNodeRef } = useDroppable({ id: "template-root" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-fit items-center gap-2 rounded px-2 py-1 text-sm text-muted-foreground",
        isOver && "bg-accent text-accent-foreground ring-2 ring-primary/40",
      )}
    >
      <FolderIcon className="h-4 w-4" />
      Todos os templates
    </div>
  );
}

/** Templates globais (`eventId=null`) ou estritamente pertencentes a um evento. */
export function TemplatesTab({ eventId }: { eventId: string | null }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
  const moveFolder = useMoveFolder(folderScope);
  const channel = channelFilter === "all" ? undefined : channelFilter;
  const { data: response, isLoading } = useAllTemplates(
    page,
    pageSize,
    channel,
    eventId,
    null,
  );

  const allFolders = flattenFolders(folderTree);
  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  const expandedIds = allFolders
    .filter((folder) => expanded.has(folder.id))
    .map((folder) => folder.id);
  const folderTemplates = useTemplatesInFolders(expandedIds, channel, eventId);

  const rootTemplates = response?.data ?? [];
  useSetRecordCount(response?.total ?? 0);
  const deleteTemplate = useDeleteTemplateGlobal();
  const moveTemplate = useMoveTemplate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithEvent | null>(null);
  const [createFolderId, setCreateFolderId] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<
    { mode: "rename"; folder: Folder } | { mode: "create"; parentId: string } | null
  >(null);
  const [folderName, setFolderName] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  // Template solto numa pasta que talvez nem tenha sido buscada ainda: fica
  // visível no destino desde o primeiro frame, até a API responder.
  const [pendingMove, setPendingMove] = useState<{
    template: TemplateWithEvent;
    folderId: string | null;
  } | null>(null);

  function templatesInFolder(folderId: string | null): TemplateWithEvent[] {
    const list = folderId === null ? rootTemplates : (folderTemplates.get(folderId) ?? []);
    if (!pendingMove) return list;
    const rest = list.filter((template) => template.id !== pendingMove.template.id);
    return pendingMove.folderId === folderId
      ? [...rest, { ...pendingMove.template, folderId }]
      : rest;
  }

  function rowsFor(parentId: string | null, depth: number): TemplateRow[] {
    return allFolders
      .filter((folder) => folder.parentId === parentId)
      .flatMap((folder): TemplateRow[] => {
        const row: TemplateRow = {
          kind: "folder",
          id: `folder:${folder.id}`,
          depth,
          folder,
        };
        if (!expanded.has(folder.id)) return [row];
        return [
          row,
          ...rowsFor(folder.id, depth + 1),
          ...templatesInFolder(folder.id).map(
            (template): TemplateRow => ({
              kind: "template",
              id: template.id,
              depth: depth + 1,
              template,
            }),
          ),
        ];
      });
  }

  const rows: TemplateRow[] = [
    ...rowsFor(null, 0),
    ...templatesInFolder(null).map(
      (template): TemplateRow => ({
        kind: "template",
        id: template.id,
        depth: 0,
        template,
      }),
    ),
  ];
  const visibleTemplates = rows.flatMap((row) =>
    row.kind === "template" ? [row.template] : [],
  );
  const templateById = new Map(visibleTemplates.map((t) => [t.id, t]));

  function toggleFolder(folderId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDropTargetId(null);
    if (!writable || !over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("folder:")) {
      const source = activeId.slice("folder:".length);
      if (overId.startsWith("folder-content:")) {
        const target = overId.slice("folder-content:".length);
        if (source === target || isDescendant(byId, target, source)) return;
        moveFolder.mutate(
          { id: source, parentId: target },
          { onError: (error) => toast.error(`Falha ao mover pasta: ${error.message}`) },
        );
        openFolder(target);
        return;
      }
      if (!overId.startsWith("folder:")) return;
      const target = overId.slice("folder:".length);
      const targetFolder = byId.get(target);
      if (!targetFolder || isDescendant(byId, target, source)) return;
      // Reordena entre os irmãos do alvo — o que também tira a pasta do nível
      // atual quando ela vem de outro.
      const parentId = targetFolder.parentId;
      const siblings = allFolders
        .filter((folder) => folder.parentId === parentId)
        .map((folder) => folder.id);
      if (siblings.includes(source)) {
        reorderFolders.mutate(
          {
            ids: arrayMove(siblings, siblings.indexOf(source), siblings.indexOf(target)),
            parentId,
          },
          {
            onError: (error) =>
              toast.error(`Falha ao reordenar pastas: ${error.message}`),
          },
        );
        return;
      }
      // Veio de outro nível: `/reorder` ignora id que não é irmão do destino, então
      // a troca de pai precisa do PATCH da pasta antes da ordem.
      const index = siblings.indexOf(target);
      moveFolder.mutate(
        {
          id: source,
          parentId,
          siblingIds: [...siblings.slice(0, index), source, ...siblings.slice(index)],
        },
        { onError: (error) => toast.error(`Falha ao mover pasta: ${error.message}`) },
      );
      return;
    }

    if (!activeId.startsWith("template:")) return;
    const id = activeId.slice("template:".length);

    if (overId.startsWith("template:")) {
      const targetId = overId.slice("template:".length);
      const target = templateById.get(targetId);
      if (!target) return;
      const targetFolderId = target.folderId ?? null;
      const siblings = templatesInFolder(targetFolderId).map((t) => t.id);
      const beforeId = siblings.includes(id)
        ? beforeIdAfterMove(siblings, id, targetId)
        : targetId;
      moveTemplate.mutate(
        { id, folderId: targetFolderId, beforeId },
        { onError: (error) => toast.error(`Falha ao mover template: ${error.message}`) },
      );
      return;
    }

    const targetFolderId = overId.startsWith("folder:")
      ? overId.slice("folder:".length)
      : overId.startsWith("folder-content:")
        ? overId.slice("folder-content:".length)
        : overId === "template-root"
          ? null
          : undefined;
    if (targetFolderId === undefined) return;
    const template = templateById.get(id);
    if (!template || (template.folderId ?? null) === targetFolderId) return;
    if (targetFolderId) openFolder(targetFolderId);
    setPendingMove({ template, folderId: targetFolderId });
    moveTemplate.mutate(
      { id, folderId: targetFolderId },
      {
        onError: (error) => toast.error(`Falha ao mover template: ${error.message}`),
        // Roda depois de a mutação reconciliar as listas com o servidor.
        onSettled: () => setPendingMove(null),
      },
    );
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    // Pasta não entra em linha de template: sem esse filtro a linha acenderia
    // como alvo de um drop que não faz nada.
    const overId = over ? String(over.id) : null;
    const invalid =
      String(active.id).startsWith("folder:") && overId?.startsWith("template:");
    setDropTargetId(invalid ? null : overId);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    const folderIds = ids
      .filter((id) => id.startsWith("folder:"))
      .map((id) => id.slice("folder:".length));
    const templateIds = ids.filter((id) => !id.startsWith("folder:"));
    const results = await Promise.allSettled([
      ...templateIds.map((id) => deleteTemplate.mutateAsync({ id })),
      ...folderIds.map((id) => deleteFolder.mutateAsync(id)),
    ]);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} de ${results.length} itens não puderam ser excluídos`);
    } else {
      toast.success(`${results.length} item(ns) excluído(s)`);
    }
    setSelected(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
  }

  function submitFolderName() {
    const trimmed = folderName.trim();
    if (!trimmed || !folderDialog) return;
    if (folderDialog.mode === "rename") {
      renameFolder.mutate({ id: folderDialog.folder.id, name: trimmed });
    } else {
      createFolder.mutate({ name: trimmed, parentId: folderDialog.parentId });
      openFolder(folderDialog.parentId);
    }
    setFolderDialog(null);
  }

  function openFolder(folderId: string) {
    setExpanded((current) => new Set(current).add(folderId));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={folderAwareCollision}
      onDragOver={handleDragOver}
      onDragCancel={() => setDropTargetId(null)}
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
                  onCreate={(name) => createFolder.mutate({ name, parentId: null })}
                />
                <DataTableDeleteButton
                  selectedCount={selected.size}
                  isPending={bulkDeleting}
                  onDelete={() => setConfirmBulkDelete(true)}
                />
                <Button
                  onClick={() => {
                    setEditing(null);
                    setCreateFolderId(null);
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

        <RootDropTarget />

        <DataTable
          columns={[
            {
              key: "drag",
              header: "",
              className: "w-10",
              cell: (row) =>
                writable ? (
                  <DragHandle
                    id={dropIdFor(row)}
                    label={
                      row.kind === "folder"
                        ? "Arrastar pasta para reordenar ou aninhar"
                        : "Arrastar template para reordenar ou mover para uma pasta"
                    }
                  />
                ) : null,
            },
            {
              key: "name",
              header: "Nome",
              align: "left",
              cell: (row) =>
                row.kind === "folder" ? (
                  <FolderNameCell
                    folder={row.folder}
                    depth={row.depth}
                    expanded={expanded.has(row.folder.id)}
                  />
                ) : (
                  <TemplateNameCell template={row.template} depth={row.depth} />
                ),
            },
            {
              key: "channel",
              header: "Canal",
              cell: (row) =>
                row.kind === "template" ? (
                  <ChannelBadge channel={row.template.channel} />
                ) : null,
            },
            {
              key: "actions",
              header: "",
              className: "w-10",
              cell: (row) =>
                row.kind === "folder" && writable ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Ações da pasta"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(null);
                            setCreateFolderId(row.folder.id);
                            openFolder(row.folder.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Novo template aqui
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFolderDialog({
                              mode: "create",
                              parentId: row.folder.id,
                            });
                            setFolderName("");
                          }}
                        >
                          <FolderIcon className="mr-2 h-4 w-4" />
                          Nova subpasta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFolderDialog({ mode: "rename", folder: row.folder });
                            setFolderName(row.folder.name);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingFolder(row.folder)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null,
            },
          ]}
          data={rows}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="Nenhum template ainda."
          onRowClick={(row) => {
            if (row.kind === "folder") {
              toggleFolder(row.folder.id);
              return;
            }
            if (!writable) return;
            setEditing(row.template);
            setCreateFolderId(null);
            setDialogOpen(true);
          }}
          selected={writable ? selected : undefined}
          onSelectedChange={writable ? setSelected : undefined}
          rowClassName={(row) =>
            cn(
              // Dentro de uma pasta o fundo é mais escuro que o da raiz.
              row.depth > 0 && "bg-muted/60",
              dropTargetId === dropIdFor(row) && "bg-accent",
            )
          }
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
          fixedFolderId={createFolderId}
        />

        <Dialog
          open={folderDialog !== null}
          onOpenChange={(open) => !open && setFolderDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {folderDialog?.mode === "create" ? "Criar subpasta" : "Renomear pasta"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="template-folder-name">Nome</Label>
              <Input
                id="template-folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitFolderName();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderDialog(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={submitFolderName}
                disabled={!folderName.trim()}
              >
                {folderDialog?.mode === "create" ? "Criar" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deletingFolder !== null}
          onOpenChange={(open) => !open && setDeletingFolder(null)}
        >
          {deletingFolder && (
            <FolderDeleteAlert
              name={deletingFolder.name}
              onDelete={() => {
                deleteFolder.mutate(deletingFolder.id);
                setDeletingFolder(null);
              }}
            />
          )}
        </AlertDialog>

        <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selected.size} item(ns)?</AlertDialogTitle>
              <AlertDialogDescription>
                Excluir uma pasta não apaga o que está dentro dela: os templates voltam
                para a lista principal e as subpastas sobem um nível. Automações que usam
                os templates excluídos podem parar de funcionar. Esta ação não pode ser
                desfeita.
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

/** Impede soltar uma pasta dentro dela mesma ou de uma descendente. */
function isDescendant(
  byId: Map<string, Folder>,
  candidateId: string,
  ancestorId: string,
): boolean {
  let current = byId.get(candidateId);
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}
