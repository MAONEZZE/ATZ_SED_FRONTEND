"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitPublicFormResponse, answerKeyForField } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";
import { isSubmitted, markSubmitted } from "@/lib/utils/local-draft";

export function RegistrationForm({
  slug,
  formSlug,
  fields,
  requireImageAuthorization = false,
  anonymous = false,
}: {
  slug: string;
  formSlug: string;
  fields: PublicFormField[];
  requireImageAuthorization?: boolean;
  anonymous?: boolean;
}) {
  const draftKey = `reg_draft_${slug}_${formSlug}`;
  const submittedKey = `reg_submitted_${slug}_${formSlug}`;
  const requireImage = requireImageAuthorization && !anonymous;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const visibleFields = useMemo(
    () =>
      [...fields]
        .filter((f) => !anonymous || f.type !== "phone")
        .sort((a, b) => a.order - b.order),
    [fields, anonymous],
  );
  const schema = useMemo(
    () => buildSchema(visibleFields, requireImage),
    [visibleFields, requireImage],
  );

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(visibleFields, requireImage),
  });

  // localStorage nao existe no server: ler so apos a montagem, e so entao
  // liberar o render real (ver skeleton abaixo) para nao quebrar a hidratacao.
  useEffect(() => {
    if (!anonymous && isSubmitted(submittedKey)) {
      setSuccess(true);
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        form.reset(parsed);
      }
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, submittedKey, anonymous]);

  const hasMounted = useRef(false);
  const watchedValues = form.watch();

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(watchedValues));
    } catch {}
  }, [watchedValues, draftKey]);

  async function onSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const answers: Record<string, unknown> = {};
      for (const field of visibleFields) {
        answers[field.label] = values[answerKeyForField(field)];
      }
      const phoneField = visibleFields.find((f) => f.type === "phone");
      const phone = phoneField
        ? (values[answerKeyForField(phoneField)] as string | undefined)
        : undefined;

      await submitPublicFormResponse(slug, formSlug, {
        phone,
        answers,
        image_authorization: requireImage
          ? (values["image_authorization"] as boolean)
          : undefined,
      });
      setSuccess(true);
      if (!anonymous) {
        markSubmitted(submittedKey);
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar inscrição");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando formulario de inscricao...</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-current/10" />
            <div className="h-10 w-full animate-pulse rounded-md bg-current/10" />
          </div>
        ))}
        <div className="h-11 w-full animate-pulse rounded-md bg-current/10" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h3 className="mt-4 text-xl font-bold">Inscrição enviada!</h3>
        <p className="mt-2 whitespace-pre-line opacity-80">
          Recebemos sua inscrição. Você receberá novidades em breve.
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

      {requireImage && (
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
