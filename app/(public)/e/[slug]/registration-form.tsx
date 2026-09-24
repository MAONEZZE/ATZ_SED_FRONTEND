"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitPublicFormResponse, answerKeyForField, fieldKey } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { renderRichText } from "@/components/ui/rich-text";
import { buildSchema, defaultValues } from "@/lib/validation/registration-form-schema";
import { isSubmitted, markSubmitted } from "@/lib/utils/local-draft";

export function RegistrationForm({
  slug,
  formSlug,
  fields,
  requireImageAuthorization = false,
  anonymous = false,
  successMessage,
  postSubscriptionLink,
}: {
  slug: string;
  formSlug: string;
  fields: PublicFormField[];
  requireImageAuthorization?: boolean;
  anonymous?: boolean;
  successMessage?: string;
  postSubscriptionLink?: string;
}) {
  const legacyDraftKey = `reg_draft_${slug}_${formSlug}`;
  const submittedKey = `reg_submitted_${slug}_${formSlug}`;
  const requireImage = requireImageAuthorization && !anonymous;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
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

  // localStorage não existe no server: verifica a flag só após a montagem e
  // libera o render real em seguida para não quebrar a hidratação.
  useEffect(() => {
    // A flag serve apenas para informar: respostas anteriores nunca impedem
    // que a pessoa preencha e envie o formulário novamente.
    setAlreadySubmitted(!anonymous && isSubmitted(submittedKey));
    // Limpa rascunhos deixados pela versão que persistia os campos. Os valores
    // do formulário devem sempre começar vazios após recarregar a página.
    try {
      localStorage.removeItem(legacyDraftKey);
    } catch {}
    setHydrated(true);
  }, [anonymous, legacyDraftKey, submittedKey]);

  async function onSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const answers: Record<string, unknown> = {};
      for (const field of visibleFields) {
        answers[answerKeyForField(field)] = values[fieldKey(field)];
      }
      const phoneField = visibleFields.find((f) => f.type === "phone");
      const phone = phoneField
        ? (values[fieldKey(phoneField)] as string | undefined)
        : undefined;

      await submitPublicFormResponse(slug, formSlug, {
        phone,
        answers,
        image_authorization: requireImage
          ? (values["image_authorization"] as boolean)
          : undefined,
      });
      setSuccess(true);
      if (!anonymous) markSubmitted(submittedKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no envio");
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
            <div className="bg-current/10 h-4 w-32 animate-pulse rounded" />
            <div className="bg-current/10 h-10 w-full animate-pulse rounded-md" />
          </div>
        ))}
        <div className="bg-current/10 h-11 w-full animate-pulse rounded-md" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h3 className="mt-4 text-xl font-bold">Resposta registrada!</h3>
        <p className="mt-2 whitespace-pre-line opacity-80">
          {successMessage
            ? renderRichText(successMessage)
            : "Obrigado por sua resposta. Você receberá novidades em breve."}
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
      {alreadySubmitted && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-left text-green-900"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm">
            Você já enviou este formulário antes. Se quiser, pode enviar uma nova
            resposta.
          </p>
        </div>
      )}

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
        Enviar
      </Button>
    </form>
  );
}
