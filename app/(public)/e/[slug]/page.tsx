import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getPublicEvent, getPublicFormFields } from "@/lib/api/public";
import { RegistrationForm } from "./registration-form";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getPublicEvent(params.slug);
  if (!event) return { title: "Evento não encontrado" };

  const description = event.description ?? `Inscreva-se no evento ${event.title}`;

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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PublicEventPage({ params }: PageProps) {
  const [event, fields] = await Promise.all([
    getPublicEvent(params.slug),
    getPublicFormFields(params.slug),
  ]);

  if (!event) notFound();

  const date = formatDate(event.eventDate);

  return (
    <main className="min-h-screen bg-background">
      {/* Capa */}
      {event.coverUrl && (
        <div className="relative h-64 w-full sm:h-80 md:h-96">
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>

        <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
          {date && (
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {date}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.location}
            </span>
          )}
          {event.capacity && (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              {event.capacity} vagas
            </span>
          )}
        </div>

        {event.description && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
            {event.description}
          </p>
        )}

        <div className="mt-10">
          <RegistrationForm
            slug={event.slug}
            fields={fields}
            successMessage={event.postRegistrationMessage ?? undefined}
          />
        </div>
      </div>

      <footer className="border-t py-6 text-center text-sm opacity-60">
        Feito com SED — Save Event Date
      </footer>
    </main>
  );
}
