"use client";

import { Breadcrumb } from "@/components/common/breadcrumb";
import { FolderCreateButton } from "@/components/common/folder-create-button";
import { FolderGrid } from "@/components/common/folder-grid";
import { useFolders } from "@/components/common/use-folders";

export default function IntTreinamentosPage() {
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Comunicação" }, { label: "Interno" }, { label: "Treinamentos" }]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Treinamentos</h1>
        <FolderCreateButton onCreate={createFolder} />
      </div>

      <FolderGrid
        folders={folders}
        basePath="/comunicacao/int-treinamentos"
        onRename={renameFolder}
        onDelete={deleteFolder}
      />
    </div>
  );
}
