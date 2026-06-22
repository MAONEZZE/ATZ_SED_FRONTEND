"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { answerKeyForField, getPublicNpsFields, submitPublicNps } from "@/lib/api/public";
import type { PublicFormField } from "@/lib/api/types";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NpsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [fields, setFields] = useState<PublicFormField[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    getPublicNpsFields(slug)
      .then((f) => {
        if (f.length === 0) {
          setLoadError("Avaliação NPS não disponível para este evento.");
        }
        setFields(f);
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function onSubmit(values: Record<string, unknown>) {
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      toast.error("Informe seu e-mail ou telefone para identificação");
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
      await submitPublicNps(slug, { identifier: trimmedId, answers });
      setDone(true);
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
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Avaliação indisponível</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle>Avaliação enviada!</CardTitle>
            <CardDescription>Obrigado pelo seu feedback.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Avaliação NPS</CardTitle>
          <CardDescription>
            Conte como foi sua experiência no evento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Seu e-mail ou telefone *</Label>
              <Input
                id="identifier"
                placeholder="seu@email.com ou (11) 99999-9999"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usado para identificar sua inscrição.
              </p>
            </div>

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
    </main>
  );
}
