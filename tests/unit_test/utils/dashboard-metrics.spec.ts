import { describe, expect, it } from "vitest";
import { countByStatus, upcomingEvents } from "@/lib/utils/dashboard-metrics";

describe("countByStatus", () => {
  it("conta ocorrências por status", () => {
    const items = [
      { status: "published" },
      { status: "draft" },
      { status: "published" },
      { status: "ended" },
    ];
    expect(countByStatus(items)).toEqual({ published: 2, draft: 1, ended: 1 });
  });

  it("lista vazia retorna objeto vazio", () => {
    expect(countByStatus([])).toEqual({});
  });
});

describe("upcomingEvents", () => {
  const now = new Date("2026-08-06T12:00:00.000Z");

  it("descarta eventDate nulo antes de comparar", () => {
    const events = [
      { id: "1", eventDate: null },
      { id: "2", eventDate: "2026-08-10T10:00:00.000Z" },
    ];
    expect(upcomingEvents(events, now).map((e) => e.id)).toEqual(["2"]);
  });

  it("descarta datas passadas", () => {
    const events = [
      { id: "past", eventDate: "2026-08-01T10:00:00.000Z" },
      { id: "future", eventDate: "2026-08-10T10:00:00.000Z" },
    ];
    expect(upcomingEvents(events, now).map((e) => e.id)).toEqual(["future"]);
  });

  it("ordena por eventDate ascendente", () => {
    const events = [
      { id: "later", eventDate: "2026-09-01T10:00:00.000Z" },
      { id: "sooner", eventDate: "2026-08-07T10:00:00.000Z" },
    ];
    expect(upcomingEvents(events, now).map((e) => e.id)).toEqual(["sooner", "later"]);
  });

  it("respeita o limite (top 5 por padrão)", () => {
    const events = Array.from({ length: 8 }, (_, i) => ({
      id: `e${i}`,
      eventDate: new Date(now.getTime() + (i + 1) * 86_400_000).toISOString(),
    }));
    expect(upcomingEvents(events, now)).toHaveLength(5);
  });

  it("funciona sobre uma página parcial (dataset !complete) sem assumir o total real", () => {
    // simula a primeira página de uma lista maior — a função só conhece o que recebeu
    const partialPage = [
      { id: "1", eventDate: "2026-08-08T10:00:00.000Z" },
      { id: "2", eventDate: "2026-08-09T10:00:00.000Z" },
      { id: "3", eventDate: null },
    ];
    expect(upcomingEvents(partialPage, now).map((e) => e.id)).toEqual(["1", "2"]);
  });
});
