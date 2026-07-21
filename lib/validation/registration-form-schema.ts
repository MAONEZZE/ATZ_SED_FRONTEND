import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input/core";
import { phoneMetadata } from "@/lib/phone/metadata";
import { answerKeyForField } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { fieldOptions } from "@/lib/forms/field-types";

export function buildSchema(
  fields: PublicFormField[],
  requireImageAuthorization = false,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const key = answerKeyForField(field);
    let schema: z.ZodTypeAny;
    switch (field.type) {
      case "email":
        schema = z.string().email("E-mail inválido");
        break;
      case "phone":
        schema = field.required
          ? z
              .string()
              .min(1, "Campo obrigatório")
              .refine((v) => isValidPhoneNumber(v, phoneMetadata), "Telefone inválido")
          : z
              .string()
              .refine(
                (v) => !v || isValidPhoneNumber(v, phoneMetadata),
                "Telefone inválido",
              );
        break;
      case "select": {
        const opts = fieldOptions(field);
        schema = field.required
          ? z
              .string()
              .min(1, "Campo obrigatório")
              .refine((v) => opts.includes(v), "Opção inválida")
          : z.string().refine((v) => !v || opts.includes(v), "Opção inválida");
        break;
      }
      case "multiselect": {
        const opts = fieldOptions(field);
        const base = z
          .array(z.string())
          .refine((vals) => vals.every((v) => opts.includes(v)), "Opção inválida");
        schema = field.required
          ? base.refine((vals) => vals.length > 0, "Selecione ao menos uma opção")
          : base;
        break;
      }
      case "checkbox":
        schema = field.required
          ? z.boolean().refine((v) => v, "Campo obrigatório")
          : z.boolean();
        break;
      case "date":
        schema = field.required ? z.string().min(1, "Campo obrigatório") : z.string();
        break;
      case "linkedin":
        schema = z.string().url("URL inválida");
        break;
      case "instagram":
        schema = z
          .string()
          .regex(/^@?[a-zA-Z0-9_.]+$/, "Usuário do Instagram inválido");
        break;
      default:
        schema = field.required ? z.string().min(1, "Campo obrigatório") : z.string();
    }
    if (!field.required && field.type !== "checkbox" && field.type !== "multiselect") {
      schema = schema.optional().or(z.literal(""));
    }
    shape[key] = schema;
  }
  if (requireImageAuthorization) {
    shape["image_authorization"] = z
      .boolean()
      .refine((v) => v, "Autorização de uso de imagem é obrigatória");
  }
  return z.object(shape);
}

export function defaultValues(
  fields: PublicFormField[],
  requireImageAuthorization = false,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const key = answerKeyForField(field);
    if (field.type === "multiselect") values[key] = [];
    else if (field.type === "checkbox") values[key] = false;
    else values[key] = "";
  }
  if (requireImageAuthorization) values["image_authorization"] = false;
  return values;
}
