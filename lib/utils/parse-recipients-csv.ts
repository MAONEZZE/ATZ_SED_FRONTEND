import type { ManualRecipient } from "@/lib/api/types";
import { normalizeBrPhone } from "@/lib/utils/normalize-phone";

export interface ParseCsvResult {
  recipients: ManualRecipient[];

  skipped: number;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseRecipientsCsv(text: string): ParseCsvResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { recipients: [], skipped: 0 };

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = splitLine(lines[0], delimiter).map(normalizeHeader);

  const nameIdx = header.findIndex((h) => h === "nome" || h === "name");
  const emailIdx = header.findIndex((h) => h === "email" || h === "e-mail");
  const phoneIdx = header.findIndex(
    (h) => h === "telefone" || h === "phone" || h === "celular",
  );

  const hasHeader = nameIdx !== -1 || emailIdx !== -1 || phoneIdx !== -1;
  const cols = hasHeader
    ? { name: nameIdx, email: emailIdx, phone: phoneIdx }
    : { name: 0, email: 1, phone: 2 };

  const rows = hasHeader ? lines.slice(1) : lines;

  const recipients: ManualRecipient[] = [];
  let skipped = 0;

  for (const line of rows) {
    const cells = splitLine(line, delimiter);
    const name = cols.name >= 0 ? (cells[cols.name] ?? "").trim() : "";
    const email = cols.email >= 0 ? (cells[cols.email] ?? "").trim() : "";
    const phoneRaw = cols.phone >= 0 ? (cells[cols.phone] ?? "").trim() : "";
    const phone = phoneRaw ? normalizeBrPhone(phoneRaw) : "";

    if (!name) {
      skipped++;
      continue;
    }
    recipients.push({
      name,
      email: email || undefined,
      phone: phone || undefined,
    });
  }

  return { recipients, skipped };
}
