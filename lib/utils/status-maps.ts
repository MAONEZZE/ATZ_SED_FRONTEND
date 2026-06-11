import type { EventStatus, FunnelStatus } from "@/lib/api/types";

/** Cores dos badges de status do funil (spec: approved=verde, rejected=vermelho, pending=amarelo, waitlist=azul, screening=roxo) */
export const funnelStatusConfig: Record<
  FunnelStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  approved: {
    label: "Aprovado",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  }
};

export const eventStatusConfig: Record<
  EventStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground",
  },
  published: {
    label: "Publicado",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  ended: {
    label: "Encerrado",
    className:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};
