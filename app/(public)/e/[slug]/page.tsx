import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarDays, Heart, MapPin, Shirt, Users } from "lucide-react";
import { getPublicEvent, getPublicFormFields } from "@/lib/api/public";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RegistrationForm } from "./registration-form";
import { FaInstagram, FaYoutube } from "react-icons/fa";

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

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function PublicEventPage({ params }: PageProps) {
  const [event, fields] = await Promise.all([
    getPublicEvent(params.slug),
    getPublicFormFields(params.slug),
  ]);

  if (!event) notFound();

  const date = formatDate(event.eventDate);

  // Backend reaproveita a mesma URL ao trocar a capa → o cache do navegador/Next
  // serviria a imagem antiga. Carimbo da geração ISR (estável até a próxima
  // revalidação, que dispara no upload da capa) fura o cache sem quebrar o ISR.
  const coverSrc = event.coverUrl
    ? `${event.coverUrl}${event.coverUrl.includes("?") ? "&" : "?"}v=${Date.now()}`
    : null;

  return (
    <main className="force-light min-h-screen bg-background text-foreground">
      {/* Capa — transição esfumaçada e suave para o fundo */}
      {coverSrc && (
        <div className="relative h-64 w-full sm:h-80 md:h-96">
          <Image
            src={coverSrc}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* fade gradual de baixo pra cima, dissolvendo a imagem no background */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div
        className={`mx-auto max-w-2xl space-y-6 px-4 pb-10 ${
          event.coverUrl ? "relative -mt-20 pt-0" : "pt-10"
        }`}
      >
        {/* Card 1 — informações do evento */}
        <Card className="shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Data e horário"
                value={date ?? "A definir"}
              />
              <InfoCard
                icon={<MapPin className="h-5 w-5" />}
                label="Local"
                value={event.location ?? "A definir"}
              />
              <InfoCard
                icon={<Shirt className="h-5 w-5" />}
                label="Dress code"
                value={event.dressCode ?? "Livre"}
              />
              <InfoCard
                icon={<Users className="h-5 w-5" />}
                label="Vagas"
                value={event.capacity != null ? `${event.capacity}` : "Ilimitadas"}
              />
            </div>

            {event.description && (
              <>
                <Separator />
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {event.description}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — formulário de inscrição */}
        <Card className="shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">Inscrição</h2>
            <RegistrationForm
              slug={event.slug}
              fields={fields}
              successMessage={event.postRegistrationMessage ?? undefined}
            />
          </CardContent>
        </Card>
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://instagram.com/by.atlaz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <FaInstagram className="h-5 w-5" />
          </a>
          <a
            href="https://www.youtube.com/@AtlazLearningBrandVenture"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <FaYoutube className="h-5 w-5" />
          </a>
        </div>
        <p className="mt-4">SED | Atlaz</p>
      </footer>
    </main>
  );
}
