"use client";

import { useEffect, useState } from "react";
import { DragOverlay, useDndContext } from "@dnd-kit/core";
import type { EventObject } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { EventCard } from "@/components/events/event-card";

/** Alvos de soltar que representam uma pasta (incluindo a raiz, no breadcrumb). */
export function isFolderTarget(id: string): boolean {
  return (
    id === "folder-root" || id.startsWith("folder:") || id.startsWith("folder-content:")
  );
}

/**
 * Card que acompanha o cursor durante o arraste. Encolhe ao ser levantado e,
 * quando está sobre uma pasta, encolhe mais e desbota — deixa claro que vai
 * "entrar" na pasta em vez de ser apenas reordenado.
 */
export function EventDragOverlay({
  event,
  ownerId,
}: {
  event: EventObject | null;
  ownerId: string | undefined;
}) {
  const { over } = useDndContext();
  const overFolder = Boolean(over && isFolderTarget(String(over.id)));

  // o card monta em tamanho normal e só encolhe no frame seguinte: sem isso a
  // transição não roda e ele apareceria pequeno de uma vez.
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    if (!event) {
      setLifted(false);
      return;
    }
    const frame = requestAnimationFrame(() => setLifted(true));
    return () => cancelAnimationFrame(frame);
  }, [event]);

  return (
    <DragOverlay>
      {event ? (
        <div
          className={cn(
            "pointer-events-none origin-center transition-[transform,opacity] duration-200 ease-out",
            overFolder ? "scale-[0.72] opacity-60" : lifted ? "scale-95" : "scale-100",
          )}
        >
          <EventCard event={event} ownerId={ownerId} />
        </div>
      ) : null}
    </DragOverlay>
  );
}
