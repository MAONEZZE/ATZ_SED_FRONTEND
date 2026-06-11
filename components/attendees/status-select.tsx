"use client";

import { toast } from "sonner";
import { useUpdateRegistrationStatus } from "@/lib/api/registrations";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import type { FunnelStatus, Registration } from "@/lib/api/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const ALL_STATUSES = Object.keys(funnelStatusConfig) as FunnelStatus[];

export function StatusSelect({
  eventId,
  registration,
}: {
  eventId: string;
  registration: Registration;
}) {
  const updateStatus = useUpdateRegistrationStatus(eventId);

  return (
    <Select
      value={registration.status}
      disabled={updateStatus.isPending}
      onValueChange={(value) => {
        if (value === registration.status) return;
        updateStatus.mutate(
          { id: registration.id, status: value as FunnelStatus },
          {
            onSuccess: () =>
              toast.success(
                `Status: ${funnelStatusConfig[value as FunnelStatus].label}`,
              ),
            onError: (e) => toast.error(e.message),
          },
        );
      }}
    >
      <SelectTrigger className="h-8 w-[160px]" aria-label={`Status de ${registration.name}`}>
        <FunnelStatusBadge status={registration.status} />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {funnelStatusConfig[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
