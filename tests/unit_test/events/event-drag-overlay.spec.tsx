import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { EventObject } from "@/lib/api/types";

const over = { id: null as string | null };

// dnd-kit fica de fora: o que importa aqui é o estado visual que o overlay
// deriva do alvo sob o cursor.
vi.mock("@dnd-kit/core", () => ({
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="overlay">{children}</div>
  ),
  useDndContext: () => ({ over: over.id ? { id: over.id } : null }),
}));

vi.mock("@/components/events/event-card", () => ({
  EventCard: () => <div data-testid="card" />,
}));

import { EventDragOverlay, isFolderTarget } from "@/components/events/event-drag-overlay";

const EVENT = { id: "e1", title: "Evento" } as EventObject;

const wrapper = () => screen.getByTestId("card").parentElement as HTMLElement;

async function renderOverlay(overId: string | null) {
  over.id = overId;
  render(<EventDragOverlay event={EVENT} ownerId="u1" />);
  // deixa o requestAnimationFrame do "levantar" rodar
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

afterEach(() => {
  cleanup();
  over.id = null;
});

describe("EventDragOverlay", () => {
  it("encolhe o card ao ser arrastado", async () => {
    await renderOverlay(null);
    expect(wrapper().className).toContain("scale-95");
    expect(wrapper().className).not.toContain("opacity-60");
  });

  it("começa em tamanho normal para a transição poder rodar", () => {
    over.id = null;
    render(<EventDragOverlay event={EVENT} ownerId="u1" />);
    expect(wrapper().className).toContain("scale-100");
    expect(wrapper().className).toContain("transition-[transform,opacity]");
  });

  it("sobre uma pasta, encolhe mais e desbota", async () => {
    await renderOverlay("folder:abc");
    expect(wrapper().className).toContain("scale-[0.72]");
    expect(wrapper().className).toContain("opacity-60");
  });

  it("vale também para a área interna da pasta e para a raiz", async () => {
    await renderOverlay("folder-content:abc");
    expect(wrapper().className).toContain("opacity-60");
    cleanup();
    await renderOverlay("folder-root");
    expect(wrapper().className).toContain("opacity-60");
  });

  it("reordenar sobre outro evento não desbota", async () => {
    await renderOverlay("event:e2");
    expect(wrapper().className).toContain("scale-95");
    expect(wrapper().className).not.toContain("opacity-60");
  });

  it("sem evento ativo, não renderiza card", () => {
    render(<EventDragOverlay event={null} ownerId="u1" />);
    expect(screen.queryByTestId("card")).toBeNull();
  });
});

describe("isFolderTarget", () => {
  it("reconhece os ids de pasta usados pelos handlers de drop", () => {
    expect(isFolderTarget("folder-root")).toBe(true);
    expect(isFolderTarget("folder:abc")).toBe(true);
    expect(isFolderTarget("folder-content:abc")).toBe(true);
  });

  it("não confunde com um card de evento", () => {
    expect(isFolderTarget("event:abc")).toBe(false);
  });
});
