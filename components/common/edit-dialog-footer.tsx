import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

export function EditDialogFooter({
  onCancel,
  onSave,
  saveLabel = "Salvar",
  isSaving = false,
  saveDisabled = false,
  saveDisabledReason,
}: {
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  saveDisabled?: boolean;
  saveDisabledReason?: string;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" className="bg-background" onClick={onCancel}>
        Cancelar
      </Button>
      {onSave && (
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || saveDisabled}
          title={saveDisabled ? saveDisabledReason : undefined}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      )}
    </DialogFooter>
  );
}
