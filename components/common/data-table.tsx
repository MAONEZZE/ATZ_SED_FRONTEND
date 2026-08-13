"use client";

import type { ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

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
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
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
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectable = Boolean(selected && onSelectedChange);
  const ids = data.map(getRowId);
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
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
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
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell
                      className="w-10 pl-4 pr-0 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected?.has(id) ?? false}
                        onCheckedChange={() => toggleOne(id)}
                        aria-label="Selecionar registro"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
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
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border bg-ink-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[72px]" aria-label="Registros por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
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
