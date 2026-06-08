/* eslint-disable @next/next/no-img-element */
import type { LandingSection, PublicEvent } from "@/lib/api/types";
import type { ReactNode } from "react";

/**
 * Renderiza as seções da landing por enabled/order.
 * `content` é JSON livre por seção — tudo com fallback gracioso.
 * Usado na página pública (/e/[slug]) e no preview do landing editor.
 */

type SectionContent = Record<string, unknown>;

function str(content: SectionContent | null, key: string): string | undefined {
  const v = content?.[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function list(content: SectionContent | null, key = "items"): SectionContent[] {
  const v = content?.[key];
  return Array.isArray(v) ? (v.filter((i) => typeof i === "object" && i) as SectionContent[]) : [];
}

export interface LandingTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  customCss?: string;
}

export function extractTheme(sections: LandingSection[]): LandingTheme {
  const hero = sections.find((s) => s.type === "hero");
  const theme = hero?.content?.theme;
  return theme && typeof theme === "object" ? (theme as LandingTheme) : {};
}

function SectionShell({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      {title && (
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">{title}</h2>
      )}
      {children}
    </section>
  );
}

function HeroSection({
  content,
  event,
}: {
  content: SectionContent | null;
  event: PublicEvent;
}) {
  const headline = str(content, "headline") ?? event.title;
  const subheadline = str(content, "subheadline") ?? event.description ?? undefined;
  const cover = str(content, "imageUrl") ?? event.coverUrl ?? undefined;
  const date = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      {cover && (
        <>
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div className={cover ? "relative z-10 text-white" : "relative z-10"}>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          {headline}
        </h1>
        {subheadline && (
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{subheadline}</p>
        )}
        {date && <p className="mt-6 text-sm font-medium uppercase tracking-wide">{date}</p>}
        {event.location && <p className="mt-1 text-sm opacity-80">{event.location}</p>}
        <a
          href="#inscricao"
          className="mt-8 inline-block rounded-full px-8 py-3 font-semibold shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: "var(--landing-primary)", color: "#fff" }}
        >
          {str(content, "ctaLabel") ?? "Inscreva-se"}
        </a>
      </div>
    </section>
  );
}

function AboutSection({
  content,
  event,
}: {
  content: SectionContent | null;
  event: PublicEvent;
}) {
  const text = str(content, "text") ?? event.description;
  if (!text) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Sobre o evento"}>
      <p className="whitespace-pre-line text-center text-lg leading-relaxed opacity-90">
        {text}
      </p>
    </SectionShell>
  );
}

function SpeakersSection({ content }: { content: SectionContent | null }) {
  const speakers = list(content);
  if (!speakers.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Palestrantes"}>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {speakers.map((s, i) => (
          <div key={i} className="text-center">
            {typeof s.photoUrl === "string" && s.photoUrl ? (
              <img
                src={s.photoUrl}
                alt={typeof s.name === "string" ? s.name : ""}
                className="mx-auto h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundColor: "var(--landing-primary)" }}
              >
                {typeof s.name === "string" ? s.name[0] : "?"}
              </div>
            )}
            <p className="mt-3 font-semibold">
              {typeof s.name === "string" ? s.name : ""}
            </p>
            {typeof s.role === "string" && (
              <p className="text-sm opacity-70">{s.role}</p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ScheduleSection({ content }: { content: SectionContent | null }) {
  const items = list(content);
  if (!items.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Programação"}>
      <ol className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 rounded-lg border p-4">
            {typeof item.time === "string" && (
              <span
                className="shrink-0 font-mono font-semibold"
                style={{ color: "var(--landing-primary)" }}
              >
                {item.time}
              </span>
            )}
            <div>
              <p className="font-semibold">
                {typeof item.title === "string" ? item.title : ""}
              </p>
              {typeof item.description === "string" && (
                <p className="text-sm opacity-70">{item.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function VenueSection({
  content,
  event,
}: {
  content: SectionContent | null;
  event: PublicEvent;
}) {
  const address = str(content, "address") ?? event.location;
  if (!address && !str(content, "mapEmbedUrl")) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Local"}>
      {address && <p className="text-center text-lg">{address}</p>}
      {str(content, "description") && (
        <p className="mt-2 text-center opacity-80">{str(content, "description")}</p>
      )}
      {str(content, "mapEmbedUrl") && (
        <iframe
          src={str(content, "mapEmbedUrl")}
          className="mt-6 h-80 w-full rounded-xl border-0"
          loading="lazy"
          title="Mapa do local"
        />
      )}
    </SectionShell>
  );
}

function FaqSection({ content }: { content: SectionContent | null }) {
  const items = list(content);
  if (!items.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Perguntas frequentes"}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details key={i} className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold marker:hidden">
              {typeof item.question === "string" ? item.question : ""}
            </summary>
            {typeof item.answer === "string" && (
              <p className="mt-2 text-sm opacity-80">{item.answer}</p>
            )}
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

function GallerySection({ content }: { content: SectionContent | null }) {
  const images = (content?.images as unknown[] | undefined)?.filter(
    (i): i is string => typeof i === "string",
  );
  if (!images?.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Galeria"}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            className="aspect-square w-full rounded-lg object-cover"
            loading="lazy"
          />
        ))}
      </div>
    </SectionShell>
  );
}

function TestimonialsSection({ content }: { content: SectionContent | null }) {
  const items = list(content);
  if (!items.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Depoimentos"}>
      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item, i) => (
          <figure key={i} className="rounded-xl border p-6">
            <blockquote className="italic opacity-90">
              “{typeof item.text === "string" ? item.text : ""}”
            </blockquote>
            <figcaption className="mt-3 font-semibold">
              {typeof item.name === "string" ? item.name : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

function SponsorsSection({ content }: { content: SectionContent | null }) {
  const items = list(content);
  if (!items.length) return null;
  return (
    <SectionShell title={str(content, "title") ?? "Patrocinadores"}>
      <div className="flex flex-wrap items-center justify-center gap-8">
        {items.map((item, i) => {
          const logo = typeof item.logoUrl === "string" ? item.logoUrl : undefined;
          const name = typeof item.name === "string" ? item.name : "";
          return logo ? (
            <img key={i} src={logo} alt={name} className="h-12 object-contain" />
          ) : (
            <span key={i} className="text-lg font-semibold opacity-70">
              {name}
            </span>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function SectionRenderer({
  sections,
  event,
  registrationSlot,
}: {
  sections: LandingSection[];
  event: PublicEvent;
  /** Form de inscrição (client island) injetado pela página */
  registrationSlot?: ReactNode;
}) {
  const ordered = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);
  const theme = extractTheme(sections);

  return (
    <div
      style={
        {
          "--landing-primary": theme.primaryColor ?? "#756D45",
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          fontFamily: theme.fontFamily,
        } as React.CSSProperties
      }
    >
      {theme.customCss && <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />}
      {ordered.map((section) => {
        const content = section.content;
        switch (section.type) {
          case "hero":
            return <HeroSection key={section.id} content={content} event={event} />;
          case "about":
            return <AboutSection key={section.id} content={content} event={event} />;
          case "registration":
            return (
              <section
                key={section.id}
                id="inscricao"
                className="mx-auto w-full max-w-2xl px-4 py-12"
              >
                <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">
                  {str(content, "title") ?? "Inscreva-se"}
                </h2>
                {registrationSlot}
              </section>
            );
          case "speakers":
            return <SpeakersSection key={section.id} content={content} />;
          case "schedule":
            return <ScheduleSection key={section.id} content={content} />;
          case "venue":
            return <VenueSection key={section.id} content={content} event={event} />;
          case "faq":
            return <FaqSection key={section.id} content={content} />;
          case "gallery":
            return <GallerySection key={section.id} content={content} />;
          case "testimonials":
            return <TestimonialsSection key={section.id} content={content} />;
          case "sponsors":
            return <SponsorsSection key={section.id} content={content} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
