import type { EventStatus, FunnelStatus } from "@/lib/api/types";

/**
 * Transições legais — espelham o contrato do backend.
 * UI só oferece transições válidas; backend continua autoritativo.
 */

export const eventStatusTransitions: Record<EventStatus, EventStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["cancelled", "ended"],
  cancelled: [],
  ended: [],
};

export const funnelStatusTransitions: Record<FunnelStatus, FunnelStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["pending", "rejected"],
  rejected: ["pending", "approved"],
};

export function canTransitionEvent(from: EventStatus, to: EventStatus): boolean {
  return eventStatusTransitions[from].includes(to);
}

export function canTransitionFunnel(from: FunnelStatus, to: FunnelStatus): boolean {
  return funnelStatusTransitions[from].includes(to);
}
