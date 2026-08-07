"use client";

import { ChevronDown } from "lucide-react";
import type { FunnelStatus, Registration } from "@/lib/api/types";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Tabela de inscritos selecionáveis, com filtro de status no cabeçalho. */
export function RecipientTable({
  registrations,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  statusFilter,
  onToggleStatusFilter,
  onClearStatusFilter,
  hasEvent,
}: {
  registrations: Registration[];
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  statusFilter: Set<FunnelStatus>;
  onToggleStatusFilter: (s: FunnelStatus) => void;
  onClearStatusFilter: () => void;
  hasEvent: boolean;
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-4 pr-0">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                disabled={registrations.length === 0}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 font-medium hover:bg-muted hover:text-foreground"
                  >
                    Status
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <p className="px-1 pb-1 text-xs text-muted-foreground">Mostrar status</p>
                  {(Object.keys(funnelStatusConfig) as FunnelStatus[]).map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={statusFilter.has(s)}
                        onCheckedChange={() => onToggleStatusFilter(s)}
                      />
                      {funnelStatusConfig[s].label}
                    </label>
                  ))}
                  {statusFilter.size > 0 && (
                    <button
                      type="button"
                      className="mt-1 w-full rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                      onClick={onClearStatusFilter}
                    >
                      Limpar filtro
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {!hasEvent
                  ? "Vincule um evento para listar os inscritos, ou adicione destinatários manualmente."
                  : statusFilter.size > 0
                    ? "Nenhum inscrito com esse status."
                    : "Nenhum inscrito ainda — adicione destinatários manualmente."}
              </TableCell>
            </TableRow>
          ) : (
            registrations.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => onToggleOne(r.id)}
              >
                <TableCell className="pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => onToggleOne(r.id)}
                    aria-label={`Selecionar ${r.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                <TableCell>
                  <FunnelStatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
