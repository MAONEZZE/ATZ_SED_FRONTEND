"use client";

import { toast } from "sonner";
import { useUpdateRegistrationStatus } from "@/lib/api/registrations";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import { funnelStatusTransitions } from "@/lib/utils/transition-maps";
import type { FunnelStatus, Registration } from "@/lib/api/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Select de status do funil — só oferece transições legais; backend dispara automações */
export function StatusSelect({
  eventId,
  registration,
}: {
  eventId: string;
  registration: Registration;
}) {
  const updateStatus = useUpdateRegistrationStatus(eventId);
  const allowed = funnelStatusTransitions[registration.status];

  if (!allowed.length) {
    return <FunnelStatusStatic status={registration.status} />;
  }

  return (
    <Select
      value={registration.status}
      disabled={updateStatus.isPending}
      onValueChange={(value) =>
        updateStatus.mutate(
          { id: registration.id, status: value as FunnelStatus },
          {
            onSuccess: () =>
              toast.success(
                `Status alterado para ${funnelStatusConfig[value as FunnelStatus].label}`,
              ),
            onError: (e) => toast.error(e.message),
          },
        )
      }
    >
      <SelectTrigger
        className="h-8 w-[160px]"
        aria-label={`Status de ${registration.name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={registration.status} disabled>
          {funnelStatusConfig[registration.status].label}
        </SelectItem>
        {allowed.map((status) => (
          <SelectItem key={status} value={status}>
            {funnelStatusConfig[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FunnelStatusStatic({ status }: { status: FunnelStatus }) {
  return (
    <span className="text-sm text-muted-foreground">
      {funnelStatusConfig[status].label}
    </span>
  );
}
