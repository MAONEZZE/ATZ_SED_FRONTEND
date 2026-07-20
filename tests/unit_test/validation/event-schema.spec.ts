import { describe, expect, it } from "vitest";
import { eventSchema, toEventInput } from "@/lib/validation/event-schema";

const base = { title: "Meu evento" };

describe("eventSchema — endDate", () => {
  it("aceita término após início", () => {
    const result = eventSchema.safeParse({
      ...base,
      eventDate: "2026-07-01T19:00",
      endDate: "2026-07-01T22:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita término antes do início, erro ancorado em endDate", () => {
    const result = eventSchema.safeParse({
      ...base,
      eventDate: "2026-07-01T19:00",
      endDate: "2026-07-01T18:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["endDate"]);
      expect(result.error.issues[0].message).toBe("Término deve ser após o início");
    }
  });

  it("não valida quando só um dos campos está preenchido", () => {
    expect(eventSchema.safeParse({ ...base, endDate: "2026-07-01T18:00" }).success).toBe(
      true,
    );
    expect(
      eventSchema.safeParse({ ...base, eventDate: "2026-07-01T19:00" }).success,
    ).toBe(true);
  });
});

describe("toEventInput — campos novos", () => {
  it("converte endDate para ISO e omite vazios", () => {
    const input = toEventInput({
      title: "Meu evento",
      eventDate: "2026-07-01T19:00",
      endDate: "2026-07-01T22:00",
    });
    expect(input.endDate).toBe(new Date("2026-07-01T22:00").toISOString());

    const empty = toEventInput({ title: "Meu evento" });
    expect(empty.endDate).toBeUndefined();
  });
});
