import { describe, expect, it } from "vitest";
import { eventSchema, toEventInput } from "@/lib/validation/event-schema";
import { APP_TIME_ZONE, utcIsoToZonedInput } from "@/lib/utils/date-time-picker";

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
    // Valor absoluto e não `new Date(...).toISOString()`: aquela forma lê o
    // fuso da máquina que roda o teste, escondendo justamente o bug que os
    // campos interpretavam no fuso do navegador. 22:00 em São Paulo (UTC-3)
    // é 01:00 UTC do dia seguinte.
    expect(input.endDate).toBe("2026-07-02T01:00:00.000Z");

    const empty = toEventInput({ title: "Meu evento" });
    expect(empty.endDate).toBeUndefined();
  });
});

// O organizador pode abrir o painel de qualquer fuso; a data do evento tem que
// significar a mesma coisa para todos. Antes, ler e gravar passavam pelo fuso
// do navegador.
describe("toEventInput — fuso fixo da aplicação", () => {
  it("interpreta o wall-clock digitado em São Paulo, não no fuso do navegador", () => {
    const input = toEventInput({ title: "x", eventDate: "2026-07-01T19:00" });
    expect(input.eventDate).toBe("2026-07-01T22:00:00.000Z");
  });

  it("recurrenceUntil (só data) vira meia-noite de São Paulo", () => {
    const input = toEventInput({
      title: "x",
      recurrenceFreq: "weekly",
      recurrenceUntil: "2026-07-01",
    });
    expect(input.recurrenceUntil).toBe("2026-07-01T03:00:00.000Z");
  });

  // O que de fato quebrava: abrir o evento e salvar sem editar deslocava a
  // data para quem não estava em Brasília.
  it("round-trip leitura→escrita não desloca o instante", () => {
    const original = "2026-07-01T22:00:00.000Z";
    const noFormulario = utcIsoToZonedInput(original, APP_TIME_ZONE);
    const devolta = toEventInput({ title: "x", eventDate: noFormulario });
    expect(devolta.eventDate).toBe(original);
  });
});
