"use client";

import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { useFolders } from "@/components/common/use-folders";

export default function JuridicoPage() {
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Jurídico</h1>
        <FolderCreateButton onCreate={createFolder} />
      </div>

      <FolderGrid
        folders={folders}
        basePath="/juridico"
        onRename={renameFolder}
        onDelete={deleteFolder}
      />
    </div>
  );
}
