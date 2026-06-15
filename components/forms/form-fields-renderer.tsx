"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { answerKeyForField } from "@/lib/api/public";
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

export function fieldOptions(field: PublicFormField): string[] {
  if (Array.isArray(field.options)) {
    return field.options.filter((o): o is string => typeof o === "string");
  }
  return [];
}

/**
 * Renderização pura dos campos do formulário de inscrição.
 * Usada na página pública (submissão real) e no preview do form builder
 * (disabled) — mesma aparência nos dois lugares.
 */
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

            {field.type === "select" && options.length > 0 && (
              <Controller
                control={form.control}
                name={key}
                render={({ field: rhf }) =>
                  options.length <= 4 ? (
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
                      {field.required && (
                        <span className="text-destructive"> *</span>
                      )}
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
