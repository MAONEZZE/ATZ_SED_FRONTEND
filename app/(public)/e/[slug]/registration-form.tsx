"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createPublicRegistration } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { renderRichText } from "@/components/ui/rich-text";
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";
import { isSubmitted, markSubmitted } from "@/lib/utils/local-draft";

export function RegistrationForm({
  slug,
  fields,
  successMessage,
  postSubscriptionLink,
  requireImageAuthorization = false,
}: {
  slug: string;
  fields: PublicFormField[];
  successMessage?: string;
  postSubscriptionLink?: string;
  requireImageAuthorization?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(() => isSubmitted(`reg_submitted_${slug}`));

  const visibleFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields],
  );
  const schema = useMemo(
    () => buildSchema(visibleFields, requireImageAuthorization),
    [visibleFields, requireImageAuthorization],
  );

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(visibleFields, requireImageAuthorization),
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
      markSubmitted(`reg_submitted_${slug}`);
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
        {postSubscriptionLink && (
          <Button asChild className="mt-6">
            <a href={postSubscriptionLink} target="_blank" rel="noopener noreferrer">
              Acessar link
            </a>
          </Button>
        )}
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

      {requireImageAuthorization && (
        <Controller
          control={form.control}
          name="image_authorization"
          render={({ field, fieldState }) => (
            <div className="">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <span className="text-xs">
                  Autorizo o uso da minha imagem conforme o{" "}
                  <a
                    href="/autorizacao-imagem.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    termo de uso de imagem
                  </a>
                  .
                </span>
              </label>
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar inscrição
      </Button>
    </form>
  );
}
