import { Check, CheckCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  eventStatusConfig,
  funnelStatusConfig,
  messageLogStatusConfig,
} from "@/lib/utils/status-maps";
import type { EventStatus, FunnelStatus, MessageLog } from "@/lib/api/types";
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

const messageLogStatusIcon: Record<MessageLog["status"], typeof Check> = {
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: XCircle,
};

export function MessageLogStatusBadge({ status }: { status: MessageLog["status"] }) {
  const config = messageLogStatusConfig[status];
  const Icon = messageLogStatusIcon[status];
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
