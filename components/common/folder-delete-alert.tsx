"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Conteúdo do "Excluir pasta?" — o botão só libera depois do check. Só a pasta
 * é apagada: o backend faz `SetNull` no vínculo, então os itens caem na raiz e
 * as subpastas sobem um nível. O estado do check vive aqui: o Radix desmonta o
 * conteúdo ao fechar, então ele volta desmarcado.
 */
export function FolderDeleteAlert({
  name,
  onDelete,
}: {
  name: string;
  onDelete: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
        <AlertDialogDescription>
          A pasta &quot;{name}&quot; será excluída, mas nada dentro dela é apagado: os
          itens voltam para a raiz e as subpastas sobem um nível.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex items-start gap-2">
        <Checkbox
          id="folder-delete-confirm"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="folder-delete-confirm"
          className="text-sm font-normal leading-snug"
        >
          Entendo que o conteúdo desta pasta será movido para a raiz.
        </Label>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          disabled={!confirmed}
          className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
          onClick={onDelete}
        >
          Excluir
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
