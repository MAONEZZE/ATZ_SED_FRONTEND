"use client";

import { useState, useEffect, useMemo } from "react";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { AnswerEditor } from "@/components/attendees/answer-editor";
import { useFormFields } from "@/lib/api/form-fields";
import type { FunnelStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format-date";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  const formId = data?.formId ?? undefined;
  const { data: fields = [] } = useFormFields(eventId, formId);
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
    onSave(draft);
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
                    {field.required && (
                      <span className="ml-0.5 text-destructive">*</span>
                    )}
                  </Label>
                  <AnswerEditor
                    field={field}
                    value={draft[field.label]}
                    onChange={(v) =>
                      setDraft((prev) => ({ ...prev, [field.label]: v }))
                    }
                  />
                </div>
              ))}
            </div>

            <EditDialogFooter
              onCancel={() => onOpenChange(false)}
              onSave={save}
              isSaving={isSaving}
              saveDisabled={!onSave}
              saveDisabledReason={saveDisabledReason}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
