export type CronFreq = "DAILY" | "WEEKLY" | "MONTHLY";

export interface CronParts {
  freq: CronFreq;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export function buildCron({ freq, time, dayOfWeek, dayOfMonth }: CronParts): string {
  const [hh, mm] = time.split(":");
  const h = String(Number(hh));
  const m = String(Number(mm));

  if (freq === "WEEKLY") return `${m} ${h} * * ${dayOfWeek ?? 0}`;
  if (freq === "MONTHLY") return `${m} ${h} ${dayOfMonth ?? 1} * *`;
  return `${m} ${h} * * *`;
}

export function parseCron(cron: string): CronParts | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [m, h, dom, , dow] = parts;
  const time = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;

  if (dom !== "*") return { freq: "MONTHLY", time, dayOfMonth: Number(dom) };
  if (dow !== "*") return { freq: "WEEKLY", time, dayOfWeek: Number(dow) };
  return { freq: "DAILY", time };
}

/**
 * Compara dois crons por valor lógico, não por string — `buildCron` remove
 * zeros à esquerda (ex.: "09:05" vira "5 9 * * *"), então uma comparação
 * literal apontaria mudança onde não houve, disparando `cron` no PATCH à toa.
 */
export function cronEquivalent(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const pa = parseCron(a);
  const pb = parseCron(b);
  if (!pa || !pb) return false;
  return (
    pa.freq === pb.freq &&
    pa.time === pb.time &&
    pa.dayOfWeek === pb.dayOfWeek &&
    pa.dayOfMonth === pb.dayOfMonth
  );
}
