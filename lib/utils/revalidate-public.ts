/**
 * Dispara revalidação on-demand da página pública do evento.
 * Same-origin (/api/revalidate) — autorizado pela sessão em cookie.
 * Fire-and-forget: falha não bloqueia o fluxo do organizador.
 */
export function revalidatePublicEvent(slug: string): void {
  void fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  }).catch(() => {
    // melhor-esforço; ISR por tempo cobre o atraso
  });
}
