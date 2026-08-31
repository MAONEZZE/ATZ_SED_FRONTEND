"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  exportRegistrationsCsv,
  useDeleteRegistrations,
  useImportRegistrations,
  useRegistrations,
  useUpdateRegistration,
} from "@/lib/api/registrations";
import {
  exportFormResponsesCsv,
  useDeleteFormResponses,
  useFormResponses,
} from "@/lib/api/form-responses";
import { useForms } from "@/lib/api/forms";
import { downloadBlob } from "@/lib/utils/download-blob";
import { parseRecipientsCsv } from "@/lib/utils/parse-recipients-csv";
import type { FormResponseRow, FunnelStatus, Registration } from "@/lib/api/types";
import { StatusSelect } from "@/components/attendees/status-select";
import {
  AttendeeDetailDialog,
  type AttendeeDetailData,
} from "@/components/attendees/attendee-detail-dialog";
import { AttendeesTable, ALL_STATUS } from "@/components/attendees/attendees-table";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { CsvImportModal } from "@/components/common/csv-import-modal";
import { useSetRecordCount } from "@/components/common/record-count";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GERAL_VALUE = "__geral__";

const IMPORT_DISABLED_ANONYMOUS_REASON =
  "Importação não disponível para formulários anônimos";
const IMPORT_DISABLED_NO_FORM_REASON = "Selecione um formulário para importar";
const SAVE_DISABLED_ANONYMOUS_REASON =
  "Edição ainda não existe no backend para esta tabela";

export default function AttendeesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: forms } = useForms(eventId);
  const sortedForms = [...(forms ?? [])].sort((a, b) => a.order - b.order);

  const [selectedFormId, setSelectedFormId] = useState(GERAL_VALUE);
  const selectedForm = sortedForms.find((f) => f.id === selectedFormId);
  const isAnonymousView = Boolean(selectedForm?.anonymous);
  const activeFormId = selectedFormId === GERAL_VALUE ? undefined : selectedFormId;

  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewing, setViewing] = useState<AttendeeDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const importRegistrations = useImportRegistrations(eventId);
  const updateRegistration = useUpdateRegistration(eventId);
  const deleteRegistrations = useDeleteRegistrations(eventId);
  const deleteFormResponses = useDeleteFormResponses(eventId);

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { recipients } = parseRecipientsCsv(reader.result as string);
      if (recipients.length === 0) {
        toast.error(
          "Nenhum inscrito válido no CSV (verifique colunas Nome, Telefone, Email).",
        );
        return;
      }
      if (!activeFormId) return;
      importRegistrations.mutate(
        {
          formId: activeFormId,
          registrations: recipients.map((r) => ({
            nome: r.name,
            telefone: r.phone,
            email: r.email,
          })),
        },
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

  async function handleExportRegistrations() {
    setExporting(true);
    try {
      const blob = await exportRegistrationsCsv(eventId, {
        status: statusFilter === ALL_STATUS ? undefined : (statusFilter as FunnelStatus),
        search: search.trim() || undefined,
        formId: activeFormId,
      });
      downloadBlob(blob, `inscritos-${eventId}.csv`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportResponses() {
    if (!selectedForm) return;
    setExporting(true);
    try {
      const blob = await exportFormResponsesCsv(eventId, selectedForm.id, {
        search: search.trim() || undefined,
      });
      downloadBlob(blob, `respostas-${selectedForm.name || selectedForm.id}.csv`);
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

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const {
    data: registrationsResponse,
    isLoading: registrationsLoading,
    isError: registrationsError,
    error: registrationsErrorObj,
  } = useRegistrations(eventId, {
    status: statusFilter === ALL_STATUS ? undefined : (statusFilter as FunnelStatus),
    search: search.trim() || undefined,
    formId: activeFormId,
    page,
    limit,
    enabled: !isAnonymousView,
  });
  const registrations = registrationsResponse?.data ?? [];

  const {
    data: formResponsesResponse,
    isLoading: formResponsesLoading,
    isError: formResponsesError,
    error: formResponsesErrorObj,
  } = useFormResponses(eventId, {
    formId: isAnonymousView ? selectedForm?.id : undefined,
    search: search.trim() || undefined,
    page,
    limit,
  });
  const formResponses = formResponsesResponse?.data ?? [];

  const total = isAnonymousView
    ? (formResponsesResponse?.total ?? 0)
    : (registrationsResponse?.total ?? 0);
  useSetRecordCount(total);

  const isError = isAnonymousView ? formResponsesError : registrationsError;
  const loadError = isAnonymousView ? formResponsesErrorObj : registrationsErrorObj;

  function openRegistrationDetails(r: Registration) {
    setViewing({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      answers: r.answers,
      createdAt: r.createdAt,
      status: r.status,
      formName: r.formName,
    });
    setDetailOpen(true);
  }

  function openResponseDetails(r: FormResponseRow) {
    setViewing({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      answers: r.answers,
      createdAt: r.createdAt,
      status: r.status,
      formName: selectedForm?.name ?? null,
    });
    setDetailOpen(true);
  }

  function handleSaveRegistration(answers: Record<string, unknown>) {
    if (!viewing) return;
    updateRegistration.mutate(
      { id: viewing.id, answers },
      {
        onSuccess: () => {
          setDetailOpen(false);
          toast.success("Respostas atualizadas");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const formSelector = (
    <Select
      value={selectedFormId}
      onValueChange={(value) => {
        setSelectedFormId(value);
        setPage(1);
        setSelectedIds(new Set());
      }}
    >
      <SelectTrigger className="w-48" aria-label="Formulário">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GERAL_VALUE}>Geral</SelectItem>
        {sortedForms.map((form) => (
          <SelectItem key={form.id} value={form.id}>
            {form.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-w-0 space-y-4">
      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p className="font-medium text-foreground">
            Não foi possível carregar os inscritos
          </p>
          <p className="text-sm">
            {loadError instanceof Error
              ? loadError.message
              : "Tente novamente mais tarde."}
          </p>
        </div>
      ) : isAnonymousView && selectedForm ? (
        <AttendeesTable
          key={selectedFormId}
          data={formResponses}
          isLoading={formResponsesLoading}
          total={total}
          getRowId={(r) => r.id}
          getName={(r) => r.name}
          getEmail={(r) => r.email}
          getPhone={(r) => r.phone}
          getCreatedAt={(r) => r.createdAt}
          getAttended={() => null}
          renderStatus={(r) => (r.status ? <FunnelStatusBadge status={r.status} /> : "—")}
          search={search}
          onSearchChange={handleSearchChange}
          page={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          selected={selectedIds}
          onSelectedChange={setSelectedIds}
          onRowClick={openResponseDetails}
          emptyMessage={
            search ? "Nenhum resultado — ajuste a busca." : "Nenhuma resposta ainda."
          }
          formSelector={formSelector}
          exporting={exporting}
          onExport={handleExportResponses}
          importDisabled
          importDisabledReason={IMPORT_DISABLED_ANONYMOUS_REASON}
          onImportClick={() => {}}
          deleteDisabled={false}
          onDeleteConfirmed={(ids) => deleteFormResponses.mutateAsync(ids)}
        />
      ) : (
        <AttendeesTable
          key={selectedFormId}
          data={registrations}
          isLoading={registrationsLoading}
          total={total}
          getRowId={(r) => r.id}
          getName={(r) => r.name}
          getEmail={(r) => r.email}
          getPhone={(r) => r.phone}
          getCreatedAt={(r) => r.createdAt}
          getAttended={(r) => r.attended}
          renderStatus={(r) => <StatusSelect eventId={eventId} registration={r} />}
          statusFilter={{ value: statusFilter, onChange: handleStatusFilter }}
          formColumn={
            selectedFormId === GERAL_VALUE
              ? { getFormName: (r) => r.formName }
              : undefined
          }
          search={search}
          onSearchChange={handleSearchChange}
          page={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          selected={selectedIds}
          onSelectedChange={setSelectedIds}
          onRowClick={openRegistrationDetails}
          emptyMessage={
            search || statusFilter !== ALL_STATUS
              ? "Nenhum inscrito encontrado — ajuste a busca ou o filtro."
              : "Nenhum inscrito ainda — compartilhe o link público do evento."
          }
          formSelector={formSelector}
          exporting={exporting}
          onExport={handleExportRegistrations}
          importDisabled={!activeFormId}
          importDisabledReason={IMPORT_DISABLED_NO_FORM_REASON}
          onImportClick={() => setCsvModalOpen(true)}
          deleteDisabled={false}
          onDeleteConfirmed={(ids) => deleteRegistrations.mutateAsync(ids)}
        />
      )}

      <AttendeeDetailDialog
        eventId={eventId}
        formId={isAnonymousView ? selectedForm?.id : undefined}
        data={viewing}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSave={isAnonymousView ? undefined : handleSaveRegistration}
        isSaving={updateRegistration.isPending}
        saveDisabledReason={isAnonymousView ? SAVE_DISABLED_ANONYMOUS_REASON : undefined}
      />

      <CsvImportModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onFile={handleImportFile}
      />
    </div>
  );
}
