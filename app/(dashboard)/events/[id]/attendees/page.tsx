"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Filter, Loader2, Search, Upload } from "lucide-react";
import {
  exportRegistrationsCsv,
  useImportRegistrations,
  useRegistrations,
} from "@/lib/api/registrations";
import { useForms } from "@/lib/api/forms";
import { downloadBlob } from "@/lib/utils/download-blob";
import { formatDate } from "@/lib/utils/format-date";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import { parseRecipientsCsv } from "@/lib/utils/parse-recipients-csv";
import type { FunnelStatus, Registration } from "@/lib/api/types";
import { StatusSelect } from "@/components/attendees/status-select";
import { AttendeeDetailSheet } from "@/components/attendees/attendee-detail-sheet";
import { FormResponsesTab } from "@/components/attendees/form-responses-tab";
import { CsvImportModal } from "@/components/common/csv-import-modal";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import { useSetRecordCount } from "@/components/common/record-count";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ALL = "all";

const BULK_DELETE_DISABLED_REASON =
  "Exclusão de inscrições ainda não existe no backend";

const REGISTRATION_TAB = "registration";
type AttendeesTab = string;

export default function AttendeesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: forms } = useForms(eventId);
  const sortedForms = [...(forms ?? [])].sort((a, b) => a.order - b.order);

  const [tab, setTab] = useState<AttendeesTab>("registration");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // null até a tabela medir quantas linhas cabem sem gerar scroll.
  const [limit, setLimit] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const importRegistrations = useImportRegistrations(eventId);

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { recipients } = parseRecipientsCsv(reader.result as string);
      if (recipients.length === 0) {
        toast.error("Nenhum inscrito válido no CSV (verifique colunas Nome, Telefone, Email).");
        return;
      }
      importRegistrations.mutate(
        recipients.map((r) => ({ nome: r.name, telefone: r.phone, email: r.email })),
        {
          onSuccess: (result) =>
            toast.success(`${result.created} criado(s), ${result.skipped} ignorado(s)`),
          onError: (e) => toast.error(e.message),
        },
      );
    };
    reader.onerror = () => toast.error("Falha ao ler o CSV");
    reader.readAsText(file);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportRegistrationsCsv(eventId, {
        status: statusFilter === ALL ? undefined : (statusFilter as FunnelStatus),
        search: search.trim() || undefined,
      });
      downloadBlob(blob, `inscritos-${eventId}.csv`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  const { data: response, isLoading } = useRegistrations(eventId, {
    status: statusFilter === ALL ? undefined : (statusFilter as FunnelStatus),
    search: search.trim() || undefined,
    page,
    limit: limit ?? 0,
  });
  const registrations = response?.data ?? [];

  useSetRecordCount(tab === "registration" ? response?.total ?? 0 : null);

  function openDetails(registration: Registration) {
    setViewing(registration);
    setSheetOpen(true);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0 space-y-4">
      {tab !== REGISTRATION_TAB && (
        <FormResponsesTab
          eventId={eventId}
          formId={tab}
          formName={sortedForms.find((f) => f.id === tab)?.name ?? ""}
          onBack={() => setTab(REGISTRATION_TAB)}
        />
      )}

      {tab === REGISTRATION_TAB && (
        <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <Button variant="outline" onClick={() => setCsvModalOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
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
            header: (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 hover:text-foreground",
                      statusFilter !== ALL && "text-primary",
                    )}
                  >
                    <Filter
                      className={cn("h-3.5 w-3.5", statusFilter !== ALL && "fill-current")}
                    />
                    {statusFilter === ALL
                      ? "Status"
                      : funnelStatusConfig[statusFilter as FunnelStatus].label}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="center">
                  <RadioGroup value={statusFilter} onValueChange={handleStatusFilter}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={ALL} id="status-filter-all" />
                      <Label htmlFor="status-filter-all" className="font-normal">
                        Todos os status
                      </Label>
                    </div>
                    {(Object.keys(funnelStatusConfig) as FunnelStatus[]).map((status) => (
                      <div key={status} className="flex items-center gap-2">
                        <RadioGroupItem value={status} id={`status-filter-${status}`} />
                        <Label htmlFor={`status-filter-${status}`} className="font-normal">
                          {funnelStatusConfig[status].label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </PopoverContent>
              </Popover>
            ),
            cell: (r) => (
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <StatusSelect eventId={eventId} registration={r} />
              </div>
            ),
          },
        ]}
        data={registrations}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={
          search || statusFilter !== ALL
            ? "Nenhum inscrito encontrado — ajuste a busca ou o filtro."
            : "Nenhum inscrito ainda — compartilhe o link público do evento."
        }
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

      <AttendeeDetailSheet
        eventId={eventId}
        registration={viewing}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
        </>
      )}

      <CsvImportModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onFile={handleImportFile}
      />
      </div>

      <Card className="lg:sticky lg:top-4">
        <CardHeader className="rounded-t-lg bg-ink-100 py-3">
          <CardTitle className="text-center text-base">Formulários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sortedForms.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum formulário ainda.
            </p>
          ) : (
            sortedForms.map((form) => (
              <Button
                key={form.id}
                type="button"
                variant={tab === form.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setTab(form.id)}
              >
                {form.name}
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
