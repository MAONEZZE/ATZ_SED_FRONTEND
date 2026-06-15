"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { useFormFields } from "@/lib/api/form-fields";
import { useUpdateRegistration } from "@/lib/api/registrations";
import type { FormField, Registration } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PhoneField } from "@/components/forms/phone-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value == null || value === "") return "—";
  return String(value);
}

function fieldOpts(field: FormField): string[] {
  if (Array.isArray(field.options))
    return field.options.filter((o): o is string => typeof o === "string");
  return [];
}

function AnswerEditor({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const opts = fieldOpts(field);
  const strVal = String(value ?? "");
  const arrVal = Array.isArray(value) ? value.map(String) : [];

  switch (field.type) {
    case "textarea":
      return (
        <Textarea rows={3} value={strVal} onChange={(e) => onChange(e.target.value)} />
      );
    case "phone":
      return <PhoneField value={strVal} onChange={(v) => onChange(v)} />;
    case "select":
      return (
        <Select value={strVal} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opts.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multiselect":
      return (
        <div className="space-y-2">
          {opts.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={arrVal.includes(opt)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...arrVal, opt] : arrVal.filter((v) => v !== opt))
                }
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
      );
    case "image":
      return <p className="text-sm text-muted-foreground">{formatAnswer(value)}</p>;
    default:
      return (
        <Input
          type={
            field.type === "email" ? "email" : field.type === "date" ? "date" : "text"
          }
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

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
  const [currentReg, setCurrentReg] = useState<Registration | null>(registration);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const { data: fields = [] } = useFormFields(eventId);
  const updateRegistration = useUpdateRegistration(eventId);

  useEffect(() => {
    setCurrentReg(registration);
    setEditing(false);
  }, [registration]);

  function startEditing() {
    if (!currentReg) return;
    const d: Record<string, unknown> = {};
    fields.forEach((f) => {
      d[f.label] = currentReg.answers[f.label] ?? "";
    });
    setDraft(d);
    setEditing(true);
  }

  function save() {
    if (!currentReg) return;
    updateRegistration.mutate(
      { id: currentReg.id, answers: draft },
      {
        onSuccess: (updated) => {
          setCurrentReg(updated);
          setEditing(false);
          toast.success("Respostas atualizadas");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {currentReg && (
          <>
            <SheetHeader>
              <SheetTitle>{currentReg.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <FunnelStatusBadge status={currentReg.status} />
                <span>{new Date(currentReg.createdAt).toLocaleDateString("pt-BR")}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium">{currentReg.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{currentReg.phone}</p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Respostas do formulário</h4>
                {!editing && (
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  {fields.map((field) => (
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={save}
                      disabled={updateRegistration.isPending}
                    >
                      {updateRegistration.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(false)}
                      disabled={updateRegistration.isPending}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                Object.entries(currentReg.answers).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-muted-foreground">{key}</p>
                    <p className="whitespace-pre-line font-medium">{formatAnswer(val)}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
