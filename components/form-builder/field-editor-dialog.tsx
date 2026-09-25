"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCreateFormField, useUpdateFormField } from "@/lib/api/form-fields";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import {
  DOCUMENT_MAX_FILES,
  fieldHasOptions,
  fieldOptions,
} from "@/lib/forms/field-types";
import type { FieldType, FormField } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fieldTypeLabels: Record<FieldType, string> = {
  text: "Texto",
  textarea: "Texto longo",
  email: "E-mail",
  phone: "Telefone",
  select: "Escolha única",
  multiselect: "Múltipla escolha",
  checkbox: "Caixa de seleção",
  document: "Arquivos",
  date: "Data",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  on_date_automation_field: "Campo de automação por data",
};

const creatableTypes: FieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "select",
  "multiselect",
  "checkbox",
  "document",
  "date",
  "linkedin",
  "instagram",
  "on_date_automation_field",
];

function optionsToText(options: unknown): string {
  return fieldOptions({ options }).join("\n");
}

export function FieldEditorDialog({
  eventId,
  slug,
  field,
  fields,
  open,
  onOpenChange,
  nextOrder,
  formId,
}: {
  eventId: string;
  slug?: string;
  field: FormField | null;
  /** Campos ja existentes no formulario — usados pra barrar label duplicada. */
  fields: FormField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  formId: string;
}) {
  const create = useCreateFormField(eventId);
  const update = useUpdateFormField(eventId);

  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(true);
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(field?.label ?? "");
      setType(field?.type ?? "text");
      setRequired(field?.required ?? true);
      setOptionsText(optionsToText(field?.options));
    }
  }, [open, field]);

  const needsOptions = fieldHasOptions(type);
  const isPending = create.isPending || update.isPending;

  function handleSave() {
    if (!label.trim()) {
      toast.error("Informe a label do campo");
      return;
    }
    // o backend indexa `answers` pela label: duas iguais no mesmo formulario
    // fazem uma resposta sobrescrever a outra.
    const duplicated = fields.some(
      (f) =>
        f.id !== field?.id && f.label.trim().toLowerCase() === label.trim().toLowerCase(),
    );
    if (duplicated) {
      toast.error("Já existe um campo com essa label neste formulário");
      return;
    }
    const choiceOptions = needsOptions
      ? optionsText
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;
    const options =
      type === "document" ? { maxFiles: DOCUMENT_MAX_FILES } : choiceOptions;

    if (needsOptions && (!choiceOptions || choiceOptions.length < 2)) {
      toast.error("Informe ao menos 2 opções (uma por linha)");
      return;
    }

    const onDone = {
      onSuccess: () => {
        if (slug) revalidatePublicEvent(slug);
        toast.success(field ? "Campo atualizado" : "Campo criado");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };

    if (field) {
      update.mutate(
        { id: field.id, input: { label: label.trim(), type, required, options } },
        onDone,
      );
    } else {
      create.mutate(
        { label: label.trim(), type, formId, required, options, order: nextOrder },
        onDone,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Editar campo" : "Novo campo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-label">Label *</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {fieldTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label htmlFor="field-options">Opções (uma por linha)</Label>
              <Textarea
                id="field-options"
                rows={4}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Opção A\nOpção B"}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="field-required">Obrigatório</Label>
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
