"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useDeleteAutomationGlobal, useEventAutomations } from "@/lib/api/global-messaging";
import { TRIGGER_LABELS } from "@/lib/api/automations";
import type { Automation } from "@/lib/api/types";
import { EventAutomationDialog } from "@/components/events/event-automation-dialog";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EventAutomationsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: response, isLoading } = useEventAutomations(id);
  const allAutomations = response?.data ?? [];
  const deleteAutomation = useDeleteAutomationGlobal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Sem paginação no backend (lista curta por evento) — pagina no cliente.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const automations = allAutomations.slice((page - 1) * pageSize, page * pageSize);

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const targets = allAutomations.filter((a) => selected.has(a.id));
    const results = await Promise.allSettled(
      targets.map((a) => deleteAutomation.mutateAsync({ eventId: id, id: a.id })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} de ${targets.length} automações não puderam ser excluídas`);
    } else {
      toast.success(`${targets.length} automação(ões) excluída(s)`);
    }
    setSelected(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex h-9 items-center justify-end gap-2">
        <DataTableDeleteButton
          selectedCount={selected.size}
          isPending={bulkDeleting}
          onDelete={() => setConfirmBulkDelete(true)}
        />
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

      <DataTable
        columns={[
          {
            key: "trigger",
            header: "Gatilho",
            align: "left",
            cell: (a) => TRIGGER_LABELS[a.trigger],
          },
          { key: "template", header: "Template", cell: (a) => a.template.name },
          {
            key: "channel",
            header: "Canal",
            cell: (a) => (a.template.channel === "whatsapp" ? "WhatsApp" : "E-mail"),
          },
          {
            key: "delay",
            header: "Atraso",
            cell: (a) => (a.delayMinutes ? `${a.delayMinutes} min` : "—"),
          },
          {
            key: "status",
            header: "Status",
            cell: (a) =>
              a.active ? (
                <Badge
                  variant="outline"
                  className="border-transparent bg-status-success-bg text-status-success-fg"
                >
                  Ativa
                </Badge>
              ) : (
                <Badge variant="outline">Inativa</Badge>
              ),
          },
        ]}
        data={automations}
        getRowId={(a) => a.id}
        isLoading={isLoading}
        emptyMessage="Nenhuma automação ainda."
        onRowClick={(a) => {
          setEditing(a);
          setDialogOpen(true);
        }}
        selected={selected}
        onSelectedChange={setSelected}
        total={allAutomations.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <EventAutomationDialog
        eventId={id}
        automation={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} automação(ões)?</AlertDialogTitle>
            <AlertDialogDescription>
              Elas deixarão de disparar mensagens. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={bulkDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
