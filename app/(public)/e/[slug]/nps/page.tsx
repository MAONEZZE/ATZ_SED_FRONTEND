"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  answerKeyForField,
  getPublicEvent,
  getPublicNpsFields,
  submitPublicNps,
} from "@/lib/api/public";
import type { PublicEvent, PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { EventCoverHero } from "@/components/forms/event-cover-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDraft, isSubmitted, markSubmitted, removeDraft, setDraft } from "@/lib/utils/local-draft";

export default function NpsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [fields, setFields] = useState<PublicFormField[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() => isSubmitted("nps_submitted"));

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    void getPublicEvent(slug).then(setEvent);
    getPublicNpsFields(slug)
      .then((f) => {
        if (f.length === 0) {
          setLoadError("Avaliação NPS não disponível para este evento.");
        }
        setFields(f);
        const draft = getDraft<Record<string, unknown>>("nps_draft");
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
    setDraft("nps_draft", watchedValues);
  }, [watchedValues]);

  async function onSubmit(values: Record<string, unknown>) {
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
      await submitPublicNps(slug, { answers });
      setDone(true);
      markSubmitted("nps_submitted");
      removeDraft("nps_draft");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar avaliação");
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
              <CardTitle>Avaliação indisponível</CardTitle>
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
              <CardTitle>Avaliação enviada!</CardTitle>
              <CardDescription>Obrigado pelo seu feedback.</CardDescription>
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
            <CardTitle>Avaliação NPS</CardTitle>
            <CardDescription>
              Conte como foi sua experiência no evento.
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
                Enviar avaliação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
