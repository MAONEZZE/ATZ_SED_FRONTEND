"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useDeleteAutomationGlobal, useEventAutomations } from "@/lib/api/global-messaging";
import { TRIGGER_LABELS } from "@/lib/api/automations";
import type { Automation } from "@/lib/api/types";
import { EventAutomationDialog } from "@/components/events/event-automation-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EventAutomationsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: response, isLoading } = useEventAutomations(id);
  const automations = response?.data;
  const deleteAutomation = useDeleteAutomationGlobal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex h-9 items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {response ? `${response.total} automação(ões)` : ""}
        </span>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova automação
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gatilho</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Atraso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[96px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {automations?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma automação ainda.
                </TableCell>
              </TableRow>
            )}
            {automations?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {TRIGGER_LABELS[a.trigger]}
                </TableCell>
                <TableCell>{a.template.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.template.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                </TableCell>
                <TableCell>{a.delayMinutes ? `${a.delayMinutes} min` : "—"}</TableCell>
                <TableCell>
                  {a.active ? (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-status-success-bg text-status-success-fg"
                    >
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar automação"
                      onClick={() => {
                        setEditing(a);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir automação"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A automação deixará de disparar mensagens.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                            onClick={() =>
                              deleteAutomation.mutate(
                                { eventId: id, id: a.id },
                                {
                                  onSuccess: () => toast.success("Automação excluída"),
                                  onError: (e) => toast.error(e.message),
                                },
                              )
                            }
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EventAutomationDialog
        eventId={id}
        automation={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
