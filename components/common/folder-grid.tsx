"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderCard } from "@/components/common/folder-card";
import type { Folder } from "@/components/common/use-folders";
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

export function FolderGrid({
  folders,
  basePath,
  onRename,
  onDelete,
}: {
  folders: Folder[];
  basePath: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            name={folder.name}
            count={folder.count}
            onOpen={() =>
              router.push(`${basePath}/folder/${folder.id}?nome=${encodeURIComponent(folder.name)}`)
            }
            onEdit={() => {
              setEditingId(folder.id);
              setName(folder.name);
            }}
            onDelete={() => onDelete(folder.id)}
          />
        ))}
      </div>

      <Dialog open={editingId != null} onOpenChange={(open) => !open && setEditingId(null)}>
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
