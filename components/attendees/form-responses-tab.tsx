"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Search } from "lucide-react";
import {
  exportUserSubscriptionsCsv,
  useUserSubscriptions,
} from "@/lib/api/user-subscriptions";
import { useFormFields } from "@/lib/api/form-fields";
import type { UserSubscription } from "@/lib/api/types";
import { downloadBlob } from "@/lib/utils/download-blob";
import { formatDate } from "@/lib/utils/format-date";
import { AnswerEditor } from "@/components/attendees/answer-editor";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { useSetRecordCount } from "@/components/common/record-count";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ResponseKind = "post_event" | "nps";

const KEY: Record<ResponseKind, "postEventAnswers" | "npsAnswers"> = {
  post_event: "postEventAnswers",
  nps: "npsAnswers",
};

const EMPTY_LABEL: Record<ResponseKind, string> = {
  post_event: "Nenhuma resposta de pós-evento ainda.",
  nps: "Nenhuma avaliação NPS ainda.",
};

const SAVE_DISABLED_REASON =
  "Edição ainda não existe no backend para esta tabela";
const BULK_DELETE_DISABLED_REASON =
  "Exclusão ainda não existe no backend para esta tabela";

export function FormResponsesTab({
  eventId,
  kind,
}: {
  eventId: string;
  kind: ResponseKind;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewing, setViewing] = useState<UserSubscription | null>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const answersKey = KEY[kind];
  const { data: fields = [] } = useFormFields(eventId, kind);
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportUserSubscriptionsCsv(eventId, {
        search: search.trim() || undefined,
      });
      downloadBlob(blob, `inscritos-${eventId}.csv`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  const { data: response, isLoading } = useUserSubscriptions(eventId, {
    search: search.trim() || undefined,
    page,
    limit,
  });

  // Só quem enviou o formulário desta aba.
  const rows = (response?.data ?? []).filter((s) => s[answersKey] != null);

  useSetRecordCount(response?.total ?? 0);

  function openDetails(sub: UserSubscription) {
    setViewing(sub);
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !viewing) return;
    const answers = (viewing[answersKey] ?? {}) as Record<string, unknown>;
    const d: Record<string, unknown> = {};
    sortedFields.forEach((f) => {
      d[f.label] = answers[f.label] ?? "";
    });
    setDraft(d);
  }, [open, viewing, sortedFields, answersKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
        <DataTableDeleteButton
          className="sm:ml-auto"
          selectedCount={selectedIds.size}
          disabled
          disabledReason={BULK_DELETE_DISABLED_REASON}
          onDelete={() => {}}
        />
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Nome", align: "left", cell: (s) => s.name },
          { key: "email", header: "E-mail", cell: (s) => s.email },
          { key: "phone", header: "Telefone", cell: (s) => s.phone },
          {
            key: "updatedAt",
            header: "Enviado em",
            cell: (s) => formatDate(s.updatedAt),
          },
        ]}
        data={rows}
        getRowId={(s) => s.id}
        isLoading={isLoading}
        emptyMessage={search ? "Nenhum resultado — ajuste a busca." : EMPTY_LABEL[kind]}
        onRowClick={openDetails}
        selected={selectedIds}
        onSelectedChange={setSelectedIds}
        total={response?.total ?? 0}
        page={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {kind === "nps" ? "Avaliação NPS" : "Respostas do pós-evento"}
                </p>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">E-mail</p>
                  <p className="font-medium">{viewing.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{viewing.phone}</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  {sortedFields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label>{field.label}</Label>
                      <AnswerEditor
                        field={field}
                        value={draft[field.label]}
                        onChange={(v) =>
                          setDraft((prev) => ({ ...prev, [field.label]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <EditDialogFooter
                onCancel={() => setOpen(false)}
                onSave={() => {}}
                saveDisabled
                saveDisabledReason={SAVE_DISABLED_REASON}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
