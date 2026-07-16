import { describe, expect, it } from "vitest";
import { buildCron, parseCron } from "@/lib/utils/automation-cron";

describe("buildCron", () => {
  it("diário", () => {
    expect(buildCron({ freq: "DAILY", time: "09:05" })).toBe("5 9 * * *");
  });

  it("semanal", () => {
    expect(buildCron({ freq: "WEEKLY", time: "09:00", dayOfWeek: 1 })).toBe(
      "0 9 * * 1",
    );
  });

  it("mensal", () => {
    expect(buildCron({ freq: "MONTHLY", time: "18:30", dayOfMonth: 15 })).toBe(
      "30 18 15 * *",
    );
  });
});

describe("parseCron — round-trip", () => {
  it("diário", () => {
    const cron = buildCron({ freq: "DAILY", time: "09:05" });
    expect(parseCron(cron)).toEqual({ freq: "DAILY", time: "09:05" });
  });

  it("semanal", () => {
    const cron = buildCron({ freq: "WEEKLY", time: "09:00", dayOfWeek: 1 });
    expect(parseCron(cron)).toEqual({ freq: "WEEKLY", time: "09:00", dayOfWeek: 1 });
  });

  it("mensal", () => {
    const cron = buildCron({ freq: "MONTHLY", time: "18:30", dayOfMonth: 15 });
    expect(parseCron(cron)).toEqual({ freq: "MONTHLY", time: "18:30", dayOfMonth: 15 });
  });

  it("retorna null para cron inválido", () => {
    expect(parseCron("* * *")).toBeNull();
  });
});
