import { Badge } from "@/components/ui/badge";
import { eventStatusConfig, funnelStatusConfig } from "@/lib/utils/status-maps";
import type { EventStatus, FunnelStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Badge base dirigido por config { label, className } — compartilhado pelos
 *  badges de status (composição, não herança). */
function ConfigBadge({ config }: { config: { label: string; className: string } }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", config.className)}>
      {config.label}
    </Badge>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <ConfigBadge config={eventStatusConfig[status]} />;
}

export function FunnelStatusBadge({ status }: { status: FunnelStatus }) {
  return <ConfigBadge config={funnelStatusConfig[status]} />;
}
