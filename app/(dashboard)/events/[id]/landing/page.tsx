"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Monitor, Save, Smartphone, Tablet } from "lucide-react";
import { useEvent } from "@/lib/api/events";
import { useLanding, useSaveLandingSections } from "@/lib/api/landing";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import type { LandingSection, PublicEvent } from "@/lib/api/types";
import { SectionRenderer } from "@/components/landing/section-renderer";
import { SectionEditorList } from "@/components/landing/section-editor";
import { ThemeEditor } from "@/components/landing/theme-editor";
import { AiChatPanel } from "@/components/landing/ai-chat-panel";
import { EmailStyleDialog } from "@/components/landing/email-style-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

function sectionsEqual(a: LandingSection, b: LandingSection): boolean {
  return (
    a.enabled === b.enabled &&
    a.order === b.order &&
    JSON.stringify(a.content ?? null) === JSON.stringify(b.content ?? null)
  );
}

export default function LandingEditorPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: event } = useEvent(eventId);
  const { data: landing, isLoading } = useLanding(eventId);
  const save = useSaveLandingSections(eventId);

  const [sections, setSections] = useState<LandingSection[]>([]);
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    if (landing) setSections(landing.sections);
  }, [landing]);

  const dirtyChanges = useMemo(() => {
    if (!landing) return [];
    return sections
      .filter((section) => {
        const original = landing.sections.find((s) => s.id === section.id);
        return original && !sectionsEqual(section, original);
      })
      .map((section) => ({
        sectionId: section.id,
        input: {
          enabled: section.enabled,
          order: section.order,
          content: section.content,
        },
      }));
  }, [sections, landing]);

  // PublicEvent sintético para o preview reutilizar o SectionRenderer da página pública
  const previewEvent = useMemo<PublicEvent | null>(() => {
    if (!event) return null;
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      coverUrl: event.coverUrl,
      location: event.location,
      capacity: event.capacity,
      dressCode: event.dressCode,
      eventDate: event.eventDate,
      endDate: event.endDate,
      postRegistrationMessage: event.postRegistrationMessage,
      status: "published",
      landingPage: { id: landing?.id ?? "", sections },
    };
  }, [event, landing?.id, sections]);

  function handleSave() {
    save.mutate(dirtyChanges, {
      onSuccess: () => {
        if (event) revalidatePublicEvent(event.slug);
        toast.success("Landing salva! Página pública atualizada.");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  if (isLoading || !previewEvent) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tabs value={device} onValueChange={(v) => setDevice(v as Device)}>
            <TabsList>
              <TabsTrigger value="desktop" aria-label="Preview desktop">
                <Monitor className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="tablet" aria-label="Preview tablet">
                <Tablet className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="mobile" aria-label="Preview mobile">
                <Smartphone className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <EmailStyleDialog defaultContent={event?.description ?? event?.title ?? ""} />
        </div>

        <Button
          onClick={handleSave}
          disabled={dirtyChanges.length === 0 || save.isPending}
        >
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar ({dirtyChanges.length})
        </Button>
      </div>

      {/* Split: editores | preview | chat IA */}
      <div className="grid gap-4 xl:grid-cols-[300px_1fr_320px]">
        <ScrollArea className="max-h-[75vh] rounded-xl border p-3">
          <div className="space-y-3">
            <ThemeEditor sections={sections} onSectionsChange={setSections} />
            <SectionEditorList sections={sections} onSectionsChange={setSections} />
          </div>
        </ScrollArea>

        <div className="overflow-hidden rounded-xl border bg-muted/30 p-4">
          <div
            className="mx-auto max-h-[75vh] overflow-y-auto rounded-lg border bg-background shadow-sm transition-all"
            style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%" }}
          >
            <SectionRenderer
              sections={sections}
              event={previewEvent}
              registrationSlot={
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Formulário de inscrição (renderizado na página pública)
                </div>
              }
            />
          </div>
        </div>

        <div className="max-h-[75vh] overflow-hidden rounded-xl border">
          <AiChatPanel sections={sections} onSectionsChange={setSections} />
        </div>
      </div>
    </div>
  );
}
