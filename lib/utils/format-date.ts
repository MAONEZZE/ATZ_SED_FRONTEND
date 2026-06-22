// Datas vêm do backend como instantes UTC. Formatamos sempre no fuso de
// Brasília para que a exibição seja determinística (independe do fuso do
// servidor no SSR ou do navegador do usuário).
const TIME_ZONE = "America/Sao_Paulo";

/** Data + hora (ex.: 22/06/2026, 16:00). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/** Apenas a data (ex.: 22/06/2026). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}
