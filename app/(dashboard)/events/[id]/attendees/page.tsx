"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Loader2, Search, Send, Users } from "lucide-react";
import { exportRegistrationsCsv, useRegistrations } from "@/lib/api/registrations";
import { downloadBlob } from "@/lib/utils/download-blob";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import type { FunnelStatus, Registration } from "@/lib/api/types";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { StatusSelect } from "@/components/attendees/status-select";
import { AttendeeDetailSheet } from "@/components/attendees/attendee-detail-sheet";
import { SendMessageDialog } from "@/components/messages/send-message-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
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

export default function AttendeesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;
  const [selected, setSelected] = useState<Registration | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendTo, setSendTo] = useState<string | null>(null);

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

  function openSendMessage(registrationId: string) {
    setSendTo(registrationId);
  }

  const { data: response, isLoading } = useRegistrations(eventId, {
    status: statusFilter === ALL ? undefined : (statusFilter as FunnelStatus),
    search: search.trim() || undefined,
    page,
    limit,
  });
  const registrations = response?.data ?? [];
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  function openDetails(registration: Registration) {
    setSelected(registration);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
        >
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

      {/* Tabela em desktop */}
      {registrations.length > 0 && (
        <div className="hidden rounded-xl border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Inscrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">{registration.name}</TableCell>
                  <TableCell>{registration.email}</TableCell>
                  <TableCell>{registration.phone}</TableCell>
                  <TableCell>
                    {new Date(registration.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <StatusSelect eventId={eventId} registration={registration} />
                  </TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Enviar mensagem para ${registration.name}`}
                        onClick={() => openSendMessage(registration.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ver detalhes de ${registration.name}`}
                        onClick={() => openDetails(registration)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Cards em mobile */}
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
                  <p className="text-sm text-muted-foreground">
                    {registration.phone}
                  </p>
                </button>
                <StatusSelect eventId={eventId} registration={registration} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
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
        registration={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <SendMessageDialog
        open={sendTo !== null}
        onOpenChange={(o) => !o && setSendTo(null)}
        eventId={eventId}
        initialRegistrationId={sendTo ?? undefined}
      />
    </div>
  );
}
