"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input/core";
import { phoneMetadata } from "@/lib/phone/metadata";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { answerKeyForField, createPublicRegistration } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";

function buildSchema(fields: PublicFormField[]) {
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
      case "multiselect":
        schema = field.required
          ? z.array(z.string()).min(1, "Selecione ao menos uma opção")
          : z.array(z.string());
        break;
      case "checkbox":
        schema = field.required
          ? z.boolean().refine((v) => v, "Campo obrigatório")
          : z.boolean();
        break;
      case "date":
        schema = field.required ? z.string().min(1, "Campo obrigatório") : z.string();
        break;
      default:
        schema = field.required ? z.string().min(1, "Campo obrigatório") : z.string();
    }
    if (!field.required && field.type !== "checkbox" && field.type !== "multiselect") {
      schema = schema.optional().or(z.literal(""));
    }
    shape[key] = schema;
  }
  return z.object(shape);
}

function defaultValues(fields: PublicFormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const key = answerKeyForField(field);
    if (field.type === "multiselect") values[key] = [];
    else if (field.type === "checkbox") values[key] = false;
    else values[key] = "";
  }
  return values;
}

export function RegistrationForm({
  slug,
  fields,
  successMessage,
}: {
  slug: string;
  fields: PublicFormField[];
  successMessage?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const visibleFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields],
  );
  const schema = useMemo(() => buildSchema(visibleFields), [visibleFields]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(visibleFields),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`reg_draft_${slug}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        form.reset(parsed);
      }
    } catch {}
  }, []);

  const hasMounted = useRef(false);
  const watchedValues = form.watch();

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    try {
      localStorage.setItem(`reg_draft_${slug}`, JSON.stringify(watchedValues));
    } catch {}
  }, [watchedValues, slug]);

  async function onSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await createPublicRegistration(slug, values);
      setSuccess(true);
      try { localStorage.removeItem(`reg_draft_${slug}`); } catch {}
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar inscrição");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h3 className="mt-4 text-xl font-bold">Inscrição enviada!</h3>
        <p className="mt-2 opacity-80">
          {successMessage ?? "Recebemos sua inscrição. Você receberá novidades em breve."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {visibleFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este evento ainda não possui campos de inscrição.
        </p>
      ) : (
        <FormFieldsRenderer fields={visibleFields} form={form} />
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar inscrição
      </Button>
    </form>
  );
}
