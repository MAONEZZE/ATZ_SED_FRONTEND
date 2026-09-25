"use client";

import type { FormField } from "@/lib/api/types";
import { documentMaxFiles, fieldOptions } from "@/lib/forms/field-types";
import { uploadRegistrationDocument } from "@/lib/api/form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneField } from "@/components/forms/phone-field";
import { DocumentField } from "@/components/forms/document-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AnswerEditor({
  field,
  value,
  onChange,
  disabled = false,
  eventId,
  onUploadingChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  eventId: string;
  onUploadingChange?: (fieldId: string, uploading: boolean) => void;
}) {
  const opts = fieldOptions(field);
  const strVal = field.type === "document" ? "" : String(value ?? "");
  const arrVal = Array.isArray(value) ? value.map(String) : [];

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          rows={3}
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "phone":
      return <PhoneField value={strVal} onChange={(v) => onChange(v)} />;
    case "select":
      return (
        <Select value={strVal} onValueChange={onChange} disabled={disabled}>
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
                disabled={disabled}
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
          disabled={disabled}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
      );
    case "document":
      return (
        <DocumentField
          inputId={`answer-document-${field.id}`}
          value={value}
          onChange={onChange}
          maxFiles={documentMaxFiles(field)}
          disabled={disabled}
          downloadable
          onUploadingChange={onUploadingChange}
          upload={async (file, onProgress) => {
            onProgress(10);
            const reference = await uploadRegistrationDocument(
              eventId,
              field.formId,
              field.id,
              file,
            );
            onProgress(100);
            return reference;
          }}
        />
      );
    case "linkedin":
    case "instagram":
      return (
        <Input
          type="url"
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          type={
            field.type === "email" ? "email" : field.type === "date" ? "date" : "text"
          }
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
