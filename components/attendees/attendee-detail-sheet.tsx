"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { AnswerEditor } from "@/components/attendees/answer-editor";
import { useFormFields } from "@/lib/api/form-fields";
import { useUpdateRegistration } from "@/lib/api/registrations";
import type { Registration } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format-date";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AttendeeDetailSheet({
  eventId,
  registration,
  open,
  onOpenChange,
}: {
  eventId: string;
  registration: Registration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const { data: fields = [] } = useFormFields(eventId);
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);
  const updateRegistration = useUpdateRegistration(eventId);

  useEffect(() => {
    if (!open || !registration) return;
    const d: Record<string, unknown> = {};
    sortedFields.forEach((f) => {
      const fallback = f.isFixed
        ? f.type === "email"
          ? registration.email
          : f.type === "phone"
            ? registration.phone
            : registration.name
        : "";
      d[f.label] = registration.answers[f.label] ?? fallback;
    });
    setDraft(d);
  }, [open, registration, sortedFields]);

  function save() {
    if (!registration) return;
    updateRegistration.mutate(
      { id: registration.id, answers: draft },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success("Respostas atualizadas");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {registration && (
          <>
            <DialogHeader>
              <DialogTitle>{registration.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <FunnelStatusBadge status={registration.status} />
                <span>{formatDate(registration.createdAt)}</span>
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
              isSaving={updateRegistration.isPending}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
