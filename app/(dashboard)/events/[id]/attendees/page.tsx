"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, Search, Upload } from "lucide-react";
import {
  exportRegistrationsCsv,
  useImportRegistrations,
  useRegistrations,
} from "@/lib/api/registrations";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

const BULK_DELETE_DISABLED_REASON =
  "Exclusão de inscrições ainda não existe no backend";

type AttendeesTab = "registration" | "post_event" | "nps";

export default function AttendeesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [tab, setTab] = useState<AttendeesTab>("registration");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
    limit,
  });
  const registrations = response?.data ?? [];

  function openDetails(registration: Registration) {
    setViewing(registration);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={tab === "registration" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("registration")}
        >
          Inscrição
        </Button>
        <Button
          variant={tab === "post_event" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("post_event")}
        >
          Pós-evento
        </Button>
        <Button
          variant={tab === "nps" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("nps")}
        >
          NPS
        </Button>
      </div>

      {tab === "post_event" && <FormResponsesTab eventId={eventId} kind="post_event" />}
      {tab === "nps" && <FormResponsesTab eventId={eventId} kind="nps" />}

      {tab === "registration" && (
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
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="sm:w-[200px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {(Object.keys(funnelStatusConfig) as FunnelStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {funnelStatusConfig[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            header: "Status",
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
  );
}
