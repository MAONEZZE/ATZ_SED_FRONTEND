"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { AnswerEditor } from "@/components/attendees/answer-editor";
import { useFormFields } from "@/lib/api/form-fields";
import type { FormField, FunnelStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format-date";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Referência estável: um `= []` no destructuring cria array novo a cada render
// enquanto os campos carregam e o efeito do draft entra em loop infinito.
const NO_FIELDS: FormField[] = [];

export interface AttendeeDetailData {
  id: string;
  name: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  createdAt: string;
  /** null = sem funil (resposta de formulário anônimo). */
  status: FunnelStatus | null;
  /** Form de origem: escopa os campos exibidos. null = origem desconhecida (legado). */
  formId: string | null;
  /** Nome do form de origem, quando houver. */
  formName: string | null;
}

export function AttendeeDetailDialog({
  eventId,
  data,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  saveDisabledReason,
}: {
  eventId: string;
  data: AttendeeDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = salvar desabilitado (ainda não existe no backend para este modo). */
  onSave?: (answers: Record<string, unknown>) => void;
  isSaving?: boolean;
  saveDisabledReason?: string;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  const handleUploadingChange = useCallback((fieldId: string, uploading: boolean) => {
    setUploadingFields((current) => {
      const next = new Set(current);
      if (uploading) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }, []);

  const formId = data?.formId ?? undefined;
  const { data: fields = NO_FIELDS } = useFormFields(eventId, formId);
  const sortedFields = useMemo(() => {
    let visible = fields;
    // Sem form de origem a API devolve os campos de todos os forms do evento:
    // mostra só os que a pessoa respondeu (e os fixos), sem repetir rótulo.
    if (!formId) {
      const seen = new Set<string>();
      visible = fields.filter((f) => {
        if (seen.has(f.label)) return false;
        if (!f.isFixed && !(f.label in (data?.answers ?? {}))) return false;
        seen.add(f.label);
        return true;
      });
    }
    return [...visible].sort((a, b) => a.order - b.order);
  }, [fields, formId, data?.answers]);

  useEffect(() => {
    if (!open || !data) return;
    const d: Record<string, unknown> = {};
    sortedFields.forEach((f) => {
      const fallback = f.isFixed
        ? f.type === "email"
          ? data.email
          : f.type === "phone"
            ? data.phone
            : data.name
        : "";
      d[f.label] = data.answers[f.label] ?? fallback;
    });
    setDraft(d);
  }, [open, data, sortedFields]);

  function save() {
    if (!data || !onSave) return;
    const answers = { ...draft };
    sortedFields.forEach((field) => {
      const value = answers[field.label];
      if (
        field.type === "document" &&
        typeof value === "string" &&
        value.startsWith("data:image/")
      ) {
        delete answers[field.label];
      }
    });
    onSave(answers);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {data && (
          <>
            <DialogHeader>
              <DialogTitle>{data.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {data.status && <FunnelStatusBadge status={data.status} />}
                <span>{formatDate(data.createdAt)}</span>
                {data.formName && <span>{data.formName}</span>}
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {sortedFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label>
                    {field.label}
                    {field.required && <span className="ml-0.5 text-destructive">*</span>}
                  </Label>
                  <AnswerEditor
                    field={field}
                    value={draft[field.label]}
                    eventId={eventId}
                    onChange={(v) => setDraft((prev) => ({ ...prev, [field.label]: v }))}
                    onUploadingChange={handleUploadingChange}
                  />
                </div>
              ))}
            </div>

            <EditDialogFooter
              onCancel={() => onOpenChange(false)}
              onSave={save}
              isSaving={isSaving}
              saveDisabled={!onSave || uploadingFields.size > 0}
              saveDisabledReason={
                uploadingFields.size > 0
                  ? "Aguarde o envio dos arquivos"
                  : saveDisabledReason
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
