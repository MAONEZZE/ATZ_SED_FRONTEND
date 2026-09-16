"use client";

import { Download } from "lucide-react";
import type { FormField } from "@/lib/api/types";
import { fieldOptions } from "@/lib/forms/field-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneField } from "@/components/forms/phone-field";
import { ImageField } from "@/components/forms/image-field";
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
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const opts = fieldOptions(field);
  const strVal = String(value ?? "");
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
    case "image":
      return (
        <div className="space-y-2">
          <ImageField
            inputId={`answer-image-${field.id}`}
            value={strVal}
            onChange={onChange}
          />
          {strVal && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadImage(strVal, imageFileName(field.label, strVal))}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar imagem
              </Button>
            </div>
          )}
        </div>
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

/** Baixa direto via blob para o arquivo não abrir numa nova aba. */
async function downloadImage(value: string, fileName: string) {
  const blob = await fetch(value).then((r) => r.blob());
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nome do arquivo ao baixar: rótulo do campo + extensão inferida do data URL. */
function imageFileName(label: string, value: string) {
  const mime = value.match(/^data:image\/([a-z0-9.+-]+)/i)?.[1];
  const ext = mime ? (mime === "jpeg" ? "jpg" : mime) : "png";
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "imagem"}.${ext}`;
}
