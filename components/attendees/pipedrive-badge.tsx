import type { PipedriveStatus } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

const CONFIG: Record<
  PipedriveStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pipedrive: enviando", variant: "secondary" },
  sent: { label: "Pipedrive: enviado", variant: "default" },
  failed: { label: "Pipedrive: falhou", variant: "destructive" },
  skipped: { label: "Pipedrive: não enviado", variant: "outline" },
};

export function PipedriveBadge({ status }: { status: PipedriveStatus | null }) {
  if (!status) return null;
  const cfg = CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
