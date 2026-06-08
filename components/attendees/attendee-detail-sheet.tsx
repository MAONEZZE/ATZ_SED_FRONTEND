"use client";

import { FunnelStatusBadge } from "@/components/common/status-badge";
import type { Registration } from "@/lib/api/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value == null || value === "") return "—";
  return String(value);
}

export function AttendeeDetailSheet({
  registration,
  open,
  onOpenChange,
}: {
  registration: Registration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {registration && (
          <>
            <SheetHeader>
              <SheetTitle>{registration.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <FunnelStatusBadge status={registration.status} />
                <span>
                  {new Date(registration.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium">{registration.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{registration.phone}</p>
              </div>

              <Separator />

              <h4 className="font-semibold">Respostas do formulário</h4>
              {Object.entries(registration.answers).map(([key, value]) => (
                <div key={key}>
                  <p className="text-muted-foreground">{key}</p>
                  <p className="whitespace-pre-line font-medium">
                    {formatAnswer(value)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
