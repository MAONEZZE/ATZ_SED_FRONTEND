import { Badge } from "@/components/ui/badge";
import { eventStatusConfig, funnelStatusConfig } from "@/lib/utils/status-maps";
import type { EventStatus, FunnelStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const config = eventStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", config.className)}>
      {config.label}
    </Badge>
  );
}

export function FunnelStatusBadge({ status }: { status: FunnelStatus }) {
  const config = funnelStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", config.className)}>
      {config.label}
    </Badge>
  );
}
