import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicEvent, getPublicFormFields, getPublicForms } from "@/lib/api/public";
import { Card, CardContent } from "@/components/ui/card";
import { EventCoverHero } from "@/components/forms/event-cover-hero";
import { RegistrationForm } from "../../registration-form";
import { renderRichText } from "@/components/ui/rich-text";

export const revalidate = 300;

interface PageProps {
  params: { slug: string; formSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getPublicEvent(params.slug);
  if (!event) return { title: "Evento não encontrado" };
  return { title: event.title };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug, formSlug } = params;
  const [event, forms, fields] = await Promise.all([
    getPublicEvent(slug),
    getPublicForms(slug),
    getPublicFormFields(slug, formSlug),
  ]);

  const form = forms.find((f) => f.slug === formSlug);
  if (!event || !form) notFound();

  const coverSrc = event.coverUrl
    ? `${event.coverUrl}${event.coverUrl.includes("?") ? "&" : "?"}v=${Date.now()}`
    : null;

  return (
    <main className="force-light flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex-1">
        <EventCoverHero coverUrl={coverSrc} title={event.title} />

        <div
          className={`mx-auto max-w-2xl space-y-6 px-4 pb-10 ${
            event.coverUrl ? "relative -mt-20 pt-0" : "pt-10"
          }`}
        >
          <Card className="shadow-sm">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{form.name}</h1>
                {form.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                    {renderRichText(form.description)}
                  </p>
                )}
              </div>

              <RegistrationForm
                slug={slug}
                formSlug={formSlug}
                fields={fields}
                requireImageAuthorization={form.requireImageAuthorization}
                anonymous={form.anonymous}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>SED | Akeel</p>
      </footer>
    </main>
  );
}
