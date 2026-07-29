import type { EventStatus, FunnelStatus, MessageLog } from "@/lib/api/types";

export const funnelStatusConfig: Record<
  FunnelStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-status-pending-bg text-status-pending-fg",
  },
  approved: {
    label: "Aprovado",
    className: "bg-status-success-bg text-status-success-fg",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-status-danger-bg text-status-danger-fg",
  },
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
    className: "bg-status-success-bg text-status-success-fg",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-status-danger-bg text-status-danger-fg",
  },
  ended: {
    label: "Encerrado",
    className: "bg-status-neutral-bg text-status-neutral-fg",
  },
};

export const messageLogStatusConfig: Record<
  MessageLog["status"],
  { label: string; className: string }
> = {
  sent: {
    label: "Enviada",
    className: "bg-status-pending-bg text-status-pending-fg",
  },
  delivered: {
    label: "Entregue",
    className: "bg-status-neutral-bg text-status-neutral-fg",
  },
  read: {
    label: "Lida",
    className: "bg-status-success-bg text-status-success-fg",
  },
  failed: {
    label: "Falhou",
    className: "bg-status-danger-bg text-status-danger-fg",
  },
};
