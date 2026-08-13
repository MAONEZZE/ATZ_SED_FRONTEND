"use client";

import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { useFolders } from "@/components/common/use-folders";

export default function AdministracaoPage() {
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
        <FolderCreateButton onCreate={createFolder} />
      </div>

      <FolderGrid
        folders={folders}
        basePath="/administracao"
        onRename={renameFolder}
        onDelete={deleteFolder}
      />
    </div>
  );
}
