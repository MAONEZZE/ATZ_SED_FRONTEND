"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  answerKeyForField,
  getPublicEvent,
  getPublicPostEventFields,
  submitPublicPostEvent,
} from "@/lib/api/public";
import type { PublicEvent, PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { EventCoverHero } from "@/components/forms/event-cover-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDraft, isSubmitted, markSubmitted, removeDraft, setDraft } from "@/lib/utils/local-draft";

export default function PostEventPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [fields, setFields] = useState<PublicFormField[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() => isSubmitted("posevent_submitted"));

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    void getPublicEvent(slug).then(setEvent);
    getPublicPostEventFields(slug)
      .then((f) => {
        if (f.length === 0) {
          setLoadError("Formulário pós-evento não disponível para este evento.");
        }
        setFields(f);
        const draft = getDraft<Record<string, unknown>>("posevent_draft");
        if (draft) form.reset(draft);
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const hasMounted = useRef(false);
  const watchedValues = form.watch();

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setDraft("posevent_draft", watchedValues);
  }, [watchedValues]);

  async function onSubmit(values: Record<string, unknown>) {
    const identifierField = fields.find((f) => f.type === "phone" || f.type === "email");
    const identifier = identifierField
      ? String(values[answerKeyForField(identifierField)] ?? "").trim()
      : "";
    if (!identifier) {
      toast.error("Preencha seu e-mail ou telefone para identificação");
      return;
    }

    const answers: Record<string, unknown> = {};
    for (const field of fields) {
      const formKey = answerKeyForField(field);
      const value = values[formKey];
      if (value !== undefined && value !== "") {
        answers[field.label] = value;
      }
    }

    setSubmitting(true);
    try {
      await submitPublicPostEvent(slug, { identifier, answers });
      setDone(true);
      markSubmitted("posevent_submitted");
      removeDraft("posevent_draft");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar respostas");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col">
        <EventCoverHero coverUrl={event?.coverUrl} title={event?.title ?? ""} />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Formulário indisponível</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col">
        <EventCoverHero coverUrl={event?.coverUrl} title={event?.title ?? ""} />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle>Respostas enviadas!</CardTitle>
              <CardDescription>Obrigado pela sua participação.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <EventCoverHero coverUrl={event?.coverUrl} title={event?.title ?? ""} />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Formulário pós-evento</CardTitle>
            <CardDescription>
              Compartilhe sua experiência conosco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormFieldsRenderer
                fields={fields}
                form={form as ReturnType<typeof useForm<Record<string, unknown>>>}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar respostas
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
