"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderCard } from "@/components/common/folder-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SortableFolderCard({
  folder,
  basePath,
  onRename,
  onDelete,
  onOpen,
  canEdit,
}: {
  folder: { id: string; name: string };
  basePath: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (folder: { id: string; name: string }) => void;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `folder:${folder.id}`,
      disabled: !canEdit,
    });
  const { setNodeRef: setContentDropRef } = useDroppable({
    id: `folder-content:${folder.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? "z-10 opacity-60" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div
        ref={setContentDropRef}
        className="pointer-events-none absolute inset-5 z-10"
      />
      <FolderCard
        name={folder.name}
        onOpen={() =>
          onOpen?.(folder) ??
          router.push(
            `${basePath}/folder/${folder.id}?nome=${encodeURIComponent(folder.name)}`,
          )
        }
        onEdit={canEdit ? () => onRename(folder.id, folder.name) : undefined}
        onDelete={canEdit ? () => onDelete(folder.id) : undefined}
      />
    </div>
  );
}

export function FolderGrid({
  folders,
  basePath,
  onRename,
  onDelete,
  onOpen,
  canEdit = true,
}: {
  folders: { id: string; name: string }[];
  basePath: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (folder: { id: string; name: string }) => void;
  canEdit?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  if (folders.length === 0) return null;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || !editingId) return;
    onRename(editingId, trimmed);
    setEditingId(null);
  }

  return (
    <>
      <SortableContext
        items={folders.map((folder) => `folder:${folder.id}`)}
        strategy={rectSortingStrategy}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <SortableFolderCard
              key={folder.id}
              folder={folder}
              basePath={basePath}
              onRename={(id, folderName) => {
                setEditingId(id);
                setName(folderName);
              }}
              onDelete={onDelete}
              onOpen={onOpen}
              canEdit={canEdit}
            />
          ))}
        </div>
      </SortableContext>

      <Dialog
        open={editingId != null}
        onOpenChange={(open) => !open && setEditingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-rename">Nome</Label>
            <Input
              id="folder-rename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
