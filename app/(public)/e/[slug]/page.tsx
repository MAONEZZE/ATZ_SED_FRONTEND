import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicEvent, getPublicFormFields } from "@/lib/api/public";
import { SectionRenderer } from "@/components/landing/section-renderer";
import { RegistrationForm } from "./registration-form";

// ISR: revalida a cada 5min + on-demand via /api/revalidate (tag event:slug)
export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getPublicEvent(params.slug);
  if (!event) return { title: "Evento não encontrado" };

  const description =
    event.description ?? `Inscreva-se no evento ${event.title}`;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      ...(event.coverUrl && {
        images: [{ url: event.coverUrl, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: event.coverUrl ? "summary_large_image" : "summary",
      title: event.title,
      description,
      ...(event.coverUrl && { images: [event.coverUrl] }),
    },
  };
}

export default async function PublicEventPage({ params }: PageProps) {
  const [event, fields] = await Promise.all([
    getPublicEvent(params.slug),
    getPublicFormFields(params.slug),
  ]);

  if (!event) notFound();

  const registrationSection = event.landingPage?.sections.find(
    (s) => s.type === "registration",
  );
  // prioridade: mensagem da seção da landing > mensagem pós-inscrição do evento
  const successMessage =
    typeof registrationSection?.content?.successMessage === "string"
      ? registrationSection.content.successMessage
      : (event.postRegistrationMessage ?? undefined);

  return (
    <main className="min-h-screen">
      <SectionRenderer
        sections={event.landingPage?.sections ?? []}
        event={event}
        registrationSlot={
          <RegistrationForm
            slug={event.slug}
            fields={fields}
            successMessage={successMessage}
          />
        }
      />
      <footer className="border-t py-6 text-center text-sm opacity-60">
        Feito com SED — Save Event Date
      </footer>
    </main>
  );
}
