"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Loader2, Search, Upload, Users } from "lucide-react";
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
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { StatusSelect } from "@/components/attendees/status-select";
import { AttendeeDetailSheet } from "@/components/attendees/attendee-detail-sheet";
import { FormResponsesTab } from "@/components/attendees/form-responses-tab";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CsvImportModal } from "@/components/common/csv-import-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const ALL = "all";

type AttendeesTab = "registration" | "post_event" | "nps";

export default function AttendeesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [tab, setTab] = useState<AttendeesTab>("registration");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selected, setSelected] = useState<Registration | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
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
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  function openDetails(registration: Registration) {
    setSelected(registration);
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
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
          <Upload className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && registrations.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Nenhum inscrito encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== ALL
              ? "Ajuste a busca ou o filtro."
              : "Compartilhe o link público do evento para receber inscrições."}
          </p>
        </div>
      )}

      {registrations.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Inscrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">{registration.name}</TableCell>
                  <TableCell>{registration.email}</TableCell>
                  <TableCell>{registration.phone}</TableCell>
                  <TableCell>
                    {formatDate(registration.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusSelect eventId={eventId} registration={registration} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver detalhes de ${registration.name}`}
                      onClick={() => openDetails(registration)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {registrations.length > 0 && (
        <div className="space-y-3 md:hidden">
          {registrations.map((registration) => (
            <Card key={registration.id}>
              <CardContent className="space-y-3 p-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => openDetails(registration)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{registration.name}</p>
                    <FunnelStatusBadge status={registration.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {registration.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{registration.phone}</p>
                </button>
                <StatusSelect eventId={eventId} registration={registration} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      <AttendeeDetailSheet
        eventId={eventId}
        registration={selected}
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
