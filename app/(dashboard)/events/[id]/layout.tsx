"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, Link2, Pencil, Users } from "lucide-react";
import { useEvent } from "@/lib/api/events";
import { CollaboratorsDialog } from "@/components/events/collaborators-dialog";
import { EventStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { segment: "edit", label: "Detalhes", icon: Pencil },
  { segment: "form", label: "Formulário", icon: ClipboardList },
  { segment: "attendees", label: "Inscritos", icon: Users },
];

export default function EventLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data: event } = useEvent(params.id);
  const [collabOpen, setCollabOpen] = useState(false);

  function handleCopyLink() {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.slug}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link público copiado!"),
      () => toast.error("Falha ao copiar link"),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{event?.title ?? ""}</h1>
        {event && <EventStatusBadge status={event.status} />}
        <div className="ml-auto flex items-center gap-2">
          {event && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copiar link
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCollabOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </>
          )}
          {event?.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Página pública
              </a>
            </Button>
          )}
        </div>
      </div>

      <nav className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max min-w-full gap-1 border-b">
          {tabs.map(({ segment, label, icon: Icon }) => {
            const href = `/events/${params.id}/${segment}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={segment}
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}

      {event && (
        <CollaboratorsDialog
          eventId={event.id}
          ownerId={event.ownerId}
          open={collabOpen}
          onOpenChange={setCollabOpen}
        />
      )}
    </div>
  );
}
