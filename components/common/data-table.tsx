"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Seleção controlada pelo caller — permite compor com o botão de exclusão em massa no toolbar. */
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  /** Linhas que não representam um registro (ex.: pastas) ficam sem checkbox. */
  isRowSelectable?: (row: T) => boolean;
  /** Classes por linha — usado para destacar o alvo do drag e o que está dentro de uma pasta. */
  rowClassName?: (row: T) => string | undefined;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado.",
  onRowClick,
  selected,
  onSelectedChange,
  isRowSelectable,
  rowClassName,
  total,
  page,
  pageSize,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectable = Boolean(selected && onSelectedChange);
  const ids = data.filter((row) => isRowSelectable?.(row) ?? true).map(getRowId);
  const allChecked = ids.length > 0 && ids.every((id) => selected?.has(id));
  const someChecked = !allChecked && ids.some((id) => selected?.has(id));

  function toggleAll() {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (allChecked) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    onSelectedChange(next);
  }

  function toggleOne(id: string) {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  return (
    <div>
      <Table
        className="table-fixed"
        containerClassName="max-h-[60vh] rounded-lg border border-border"
      >
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10 pl-4 pr-0 text-center">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos os registros desta página"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.align === "left"
                    ? "text-left"
                    : col.align === "right"
                      ? "text-right"
                      : "text-center",
                  col.className,
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center"
              >
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  data-state={selected?.has(id) ? "selected" : undefined}
                  className={cn(
                    "h-12",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row),
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell
                      className="w-10 pl-4 pr-0 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(isRowSelectable?.(row) ?? true) && (
                        <Checkbox
                          checked={selected?.has(id) ?? false}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label="Selecionar registro"
                        />
                      )}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        // A linha tem altura fixa (TABLE_ROW_HEIGHT); conteúdo longo é
                        // cortado em vez de quebrar linha e estourar a medida.
                        "truncate",
                        col.align === "left"
                          ? "text-left"
                          : col.align === "right"
                            ? "text-right"
                            : "text-center",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

/**
 * Anterior/Próxima no footer fixo do dashboard, inclusive quando há uma página.
 * `inline` pula o portal — usado quando a tabela vive dentro de outro fluxo
 * (ex.: um formulário) e a paginação precisa ficar junto dela.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  inline = false,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  inline?: boolean;
}) {
  const [footer, setFooter] = useState<HTMLElement | null>(null);
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  useEffect(() => {
    if (inline) return;
    setFooter(document.getElementById("dashboard-pagination-footer"));
  }, [inline]);

  const pagination = (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        {safePage}/{safeTotalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={safePage >= safeTotalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        Próxima
      </Button>
    </div>
  );

  return footer ? createPortal(pagination, footer) : pagination;
}

export function DataTableDeleteButton({
  selectedCount,
  onDelete,
  disabled = false,
  disabledReason,
  isPending = false,
  className,
}: {
  selectedCount: number;
  onDelete: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isPending?: boolean;
  className?: string;
}) {
  const isDisabled = disabled || selectedCount === 0 || isPending;
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      disabled={isDisabled}
      title={disabled ? disabledReason : undefined}
      onClick={onDelete}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      Excluir {selectedCount > 0 ? `(${selectedCount})` : ""}
    </Button>
  );
}
