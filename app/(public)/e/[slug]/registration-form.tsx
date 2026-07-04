"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createPublicRegistration } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";
import { renderRichText } from "@/components/ui/rich-text";
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";

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
      try {
        localStorage.removeItem(`reg_draft_${slug}`);
      } catch {}
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
        <p className="mt-2 whitespace-pre-line opacity-80">
          {successMessage
            ? renderRichText(successMessage)
            : "Recebemos sua inscrição. Você receberá novidades em breve."}
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
