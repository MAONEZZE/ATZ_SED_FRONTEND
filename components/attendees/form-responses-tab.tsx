"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Search } from "lucide-react";
import { exportFormResponsesCsv, useFormResponses } from "@/lib/api/form-responses";
import { useFormFields } from "@/lib/api/form-fields";
import type { FormResponseRow } from "@/lib/api/types";
import { downloadBlob } from "@/lib/utils/download-blob";
import { formatDate } from "@/lib/utils/format-date";
import { AnswerEditor } from "@/components/attendees/answer-editor";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { EditDialogFooter } from "@/components/common/edit-dialog-footer";
import { useSetRecordCount } from "@/components/common/record-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SAVE_DISABLED_REASON =
  "Edição ainda não existe no backend para esta tabela";
const BULK_DELETE_DISABLED_REASON =
  "Exclusão ainda não existe no backend para esta tabela";

export function FormResponsesTab({
  eventId,
  formId,
  formName,
  onBack,
}: {
  eventId: string;
  formId: string;
  formName: string;
  onBack?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // null até a tabela medir quantas linhas cabem sem gerar scroll.
  const [limit, setLimit] = useState<number | null>(null);
  const [viewing, setViewing] = useState<FormResponseRow | null>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const { data: fields = [] } = useFormFields(eventId, formId);
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportFormResponsesCsv(eventId, formId, {
        search: search.trim() || undefined,
      });
      downloadBlob(blob, `respostas-${formName || formId}.csv`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  const { data: response, isLoading } = useFormResponses(eventId, {
    formId,
    search: search.trim() || undefined,
    page,
    limit: limit ?? 0,
  });

  const rows = response?.data ?? [];

  useSetRecordCount(response?.total ?? 0);

  function openDetails(row: FormResponseRow) {
    setViewing(row);
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !viewing) return;
    const d: Record<string, unknown> = {};
    sortedFields.forEach((f) => {
      d[f.label] = viewing.answers[f.label] ?? "";
    });
    setDraft(d);
  }, [open, viewing, sortedFields]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        )}
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
          { key: "name", header: "Nome", align: "left", cell: (r) => r.name },
          { key: "email", header: "E-mail", cell: (r) => r.email },
          { key: "phone", header: "Telefone", cell: (r) => r.phone },
          {
            key: "createdAt",
            header: "Inscrição",
            cell: (r) => formatDate(r.createdAt),
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => (r.status ? <FunnelStatusBadge status={r.status} /> : "—"),
          },
        ]}
        data={rows}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={search ? "Nenhum resultado — ajuste a busca." : "Nenhuma resposta ainda."}
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
                <p className="text-sm text-muted-foreground">{formName}</p>
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
