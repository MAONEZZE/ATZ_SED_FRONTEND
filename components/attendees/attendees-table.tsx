"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, Loader2, Search, Upload } from "lucide-react";
import {
  DataTable,
  DataTableDeleteButton,
  type DataTableColumn,
} from "@/components/common/data-table";
import { PageSizeSelect } from "@/components/common/page-size-select";
import { AttendanceBadge } from "@/components/common/status-badge";
import { formatDate } from "@/lib/utils/format-date";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import type { FunnelStatus } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

export const ALL_STATUS = "all";
const MAX_BULK_DELETE = 500;
const MAX_NAMES_SHOWN = 10;

export interface AttendeesTableProps<T> {
  data: T[];
  isLoading: boolean;
  total: number;
  getRowId: (row: T) => string;
  getName: (row: T) => string;
  getEmail: (row: T) => string;
  getPhone: (row: T) => string;
  getCreatedAt: (row: T) => string;
  getAttended: (row: T) => boolean | null;
  renderStatus: (row: T) => ReactNode;
  /** Presente = coluna Status vira filtro (modo inscritos). Ausente = cabeçalho fixo "Status" (modo anônimo). */
  statusFilter?: {
    value: string;
    onChange: (value: string) => void;
  };
  /** Presente só na view "Geral", entre Telefone e Inscrição. */
  formColumn?: {
    getFormName: (row: T) => string | null;
  };

  search: string;
  onSearchChange: (value: string) => void;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  selected: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;

  onRowClick: (row: T) => void;
  emptyMessage: string;

  formSelector: ReactNode;

  exporting: boolean;
  onExport: () => void;

  importDisabled: boolean;
  importDisabledReason?: string;
  onImportClick: () => void;

  deleteDisabled: boolean;
  deleteDisabledReason?: string;
  onDeleteConfirmed: (ids: string[]) => Promise<{ deleted: number }>;
}

export function AttendeesTable<T>({
  data,
  isLoading,
  total,
  getRowId,
  getName,
  getEmail,
  getPhone,
  getCreatedAt,
  getAttended,
  renderStatus,
  statusFilter,
  formColumn,
  search,
  onSearchChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selected,
  onSelectedChange,
  onRowClick,
  emptyMessage,
  formSelector,
  exporting,
  onExport,
  importDisabled,
  importDisabledReason,
  onImportClick,
  deleteDisabled,
  deleteDisabledReason,
  onDeleteConfirmed,
}: AttendeesTableProps<T>) {
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Acumula nome por id conforme as páginas passam pela tela — cobre o caso em
  // que a seleção atravessa páginas e `data` só tem a página atual.
  useEffect(() => {
    setNameById((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of data) {
        const id = getRowId(row);
        const name = getName(row);
        if (next[id] !== name) {
          next[id] = name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const overCap = selected.size > MAX_BULK_DELETE;
  const isDeleteDisabled = deleteDisabled || overCap;
  const deleteReason = deleteDisabled
    ? deleteDisabledReason
    : overCap
      ? `Selecione no máximo ${MAX_BULK_DELETE} registros por vez`
      : undefined;

  const selectedNames = Array.from(selected).map((id) => nameById[id] ?? id);
  const shownNames = selectedNames.slice(0, MAX_NAMES_SHOWN);
  const remaining = selectedNames.length - shownNames.length;

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      const result = await onDeleteConfirmed(Array.from(selected));
      onSelectedChange(new Set());
      toast.success(`${result.deleted} inscrito(s) excluído(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir inscritos");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  const columns: DataTableColumn<T>[] = [
    { key: "name", header: "Nome", align: "left", cell: (r) => getName(r) },
    { key: "email", header: "E-mail", cell: (r) => getEmail(r) },
    { key: "phone", header: "Telefone", cell: (r) => getPhone(r) },
    ...(formColumn
      ? [
          {
            key: "formName",
            header: "Formulário",
            cell: (r: T) => formColumn.getFormName(r) ?? "—",
          },
        ]
      : []),
    {
      key: "createdAt",
      header: "Inscrição",
      cell: (r) => formatDate(getCreatedAt(r)),
    },
    {
      key: "status",
      header: statusFilter ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 hover:text-foreground",
                statusFilter.value !== ALL_STATUS && "text-primary",
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {statusFilter.value === ALL_STATUS
                ? "Status"
                : funnelStatusConfig[statusFilter.value as FunnelStatus].label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="center">
            <RadioGroup value={statusFilter.value} onValueChange={statusFilter.onChange}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={ALL_STATUS} id="status-filter-all" />
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
      ) : (
        "Status"
      ),
      cell: (r) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          {renderStatus(r)}
        </div>
      ),
    },
    {
      key: "attended",
      header: "Checkin",
      className: "w-24",
      cell: (r) => {
        const attended = getAttended(r);
        return attended === null ? "—" : <AttendanceBadge attended={attended} />;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={onImportClick}
          disabled={importDisabled}
          title={importDisabled ? importDisabledReason : undefined}
        >
          <Download className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
        <Button variant="outline" onClick={onExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
        {formSelector}
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
        <DataTableDeleteButton
          className="sm:ml-auto"
          selectedCount={selected.size}
          disabled={isDeleteDisabled}
          disabledReason={deleteReason}
          onDelete={() => setConfirmOpen(true)}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={getRowId}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
        selected={selected}
        onSelectedChange={onSelectedChange}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedNames.length} inscrito(s)?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <ul className="list-inside list-disc">
                  {shownNames.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
                {remaining > 0 && <p>e mais {remaining}</p>}
                <p>
                  Mensagens e logs associados a esses inscritos também serão apagados.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
