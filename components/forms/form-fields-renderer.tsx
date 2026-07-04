"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { ImagePlus } from "lucide-react";
import { answerKeyForField } from "@/lib/api/public";
import { fieldOptions, rendersAsRadioGroup } from "@/lib/forms/field-types";
import type { PublicFormField } from "@/lib/api/types";
import { PhoneField } from "@/components/forms/phone-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function ImageField({
  value,
  onChange,
  disabled,
  inputId,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Clique para enviar uma imagem"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Imagem enviada"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!disabled && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-transparent transition-all group-hover:bg-black/55 group-hover:text-white">
                Clique para trocar a imagem
              </span>
            )}
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Clique para enviar uma imagem</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}

export function FormFieldsRenderer({
  fields,
  form,
  disabled = false,
}: {
  fields: PublicFormField[];
  form: UseFormReturn<Record<string, unknown>>;
  disabled?: boolean;
}) {
  return (
    <>
      {fields.map((field) => {
        const key = answerKeyForField(field);
        const error = form.formState.errors[key];
        const options = fieldOptions(field);

        return (
          <div key={field.id} className="space-y-2">
            {field.type !== "checkbox" && (
              <Label htmlFor={key}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
            )}

            {field.type === "textarea" && (
              <Textarea id={key} disabled={disabled} {...form.register(key)} />
            )}

            {(field.type === "text" || field.type === "email") && (
              <Input
                id={key}
                type={field.type === "email" ? "email" : "text"}
                disabled={disabled}
                {...form.register(key)}
              />
            )}

            {field.type === "phone" && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => (
                  <PhoneField
                    id={key}
                    value={(rhf.value as string) ?? ""}
                    onChange={rhf.onChange}
                    disabled={disabled}
                  />
                )}
              />
            )}

            {field.type === "date" && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => (
                  <DateTimePicker
                    id={key}
                    mode="date"
                    disabled={disabled}
                    value={(rhf.value as string) ?? ""}
                    onChange={rhf.onChange}
                  />
                )}
              />
            )}

            {field.type === "image" && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => (
                  <ImageField
                    inputId={key}
                    value={(rhf.value as string) ?? ""}
                    onChange={rhf.onChange}
                    disabled={disabled}
                  />
                )}
              />
            )}

            {field.type === "select" && options.length > 0 && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) =>
                  rendersAsRadioGroup(options) ? (
                    <RadioGroup
                      value={(rhf.value as string) ?? ""}
                      onValueChange={rhf.onChange}
                      disabled={disabled}
                    >
                      {options.map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`${key}-${opt}`} />
                          <Label htmlFor={`${key}-${opt}`} className="font-normal">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Select
                      value={(rhf.value as string) ?? ""}
                      onValueChange={rhf.onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger id={key}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }
              />
            )}

            {field.type === "multiselect" && options.length > 0 && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => {
                  const selected = (rhf.value as string[]) ?? [];
                  return (
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox
                            id={`${key}-${opt}`}
                            checked={selected.includes(opt)}
                            disabled={disabled}
                            onCheckedChange={(checked) => {
                              rhf.onChange(
                                checked
                                  ? [...selected, opt]
                                  : selected.filter((v) => v !== opt),
                              );
                            }}
                          />
                          <Label htmlFor={`${key}-${opt}`} className="font-normal">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            )}

            {field.type === "checkbox" && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={Boolean(rhf.value)}
                      disabled={disabled}
                      onCheckedChange={rhf.onChange}
                    />
                    <Label htmlFor={key} className="font-normal">
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                  </div>
                )}
              />
            )}

            {error && (
              <p className="text-sm text-destructive">
                {typeof error.message === "string" ? error.message : "Campo inválido"}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
