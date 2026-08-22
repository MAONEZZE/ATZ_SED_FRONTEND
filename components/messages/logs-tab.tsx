"use client";

import { useState } from "react";
import { useMessageLogs } from "@/lib/api/global-messaging";
import type { MessageLogWithEvent } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format-date";
import { ChannelBadge } from "@/components/messages/channel-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MessageLogStatusBadge } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/data-table";
import {
  RESERVED_BELOW,
  TABLE_ROW_HEIGHT,
  useFitPageSize,
} from "@/components/common/use-fit-page-size";
import { useSetRecordCount } from "@/components/common/record-count";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Logs de envio. Com `eventId`, lista só os do evento e some a coluna Evento. */
export function LogsTab({ eventId }: { eventId?: string }) {
  const [page, setPage] = useState(1);
  // A tabela é medida vazia; o fetch só dispara com o limite que cabe na tela.
  const { ref: bodyRef, pageSize } = useFitPageSize<HTMLTableSectionElement>({
    itemHeight: TABLE_ROW_HEIGHT,
    reserved: RESERVED_BELOW,
  });
  const { data: response, isLoading } = useMessageLogs({
    eventId,
    page,
    limit: pageSize ?? 0,
  });
  const logs = response?.data;
  const totalPages = pageSize && response ? Math.ceil(response.total / pageSize) : 0;
  const [viewing, setViewing] = useState<MessageLogWithEvent | null>(null);
  const cols = eventId ? 4 : 5;

  useSetRecordCount(response?.total ?? 0);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destinatário</TableHead>
              <TableHead>Canal</TableHead>
              {!eventId && <TableHead>Evento</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-[96px] text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={bodyRef}>
            {logs?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={cols}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma mensagem enviada ainda.
                </TableCell>
              </TableRow>
            )}
            {logs?.map((log) => (
              <TableRow
                key={log.id}
                className="h-12 cursor-pointer"
                onClick={() => setViewing(log)}
              >
                <TableCell className="font-medium">{log.recipient}</TableCell>
                <TableCell>
                  <ChannelBadge channel={log.channel} />
                </TableCell>
                {!eventId && (
                  <TableCell className="text-muted-foreground">
                    {log.event?.title ?? "—"}
                  </TableCell>
                )}
                <TableCell>
                  <MessageLogStatusBadge status={log.status} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDateTime(log.sentAt ?? log.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={viewing != null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.recipient}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ChannelBadge channel={viewing.channel} />
                  {!eventId && <span>{viewing.event?.title ?? "Sem evento"}</span>}
                  <MessageLogStatusBadge status={viewing.status} />
                  <span>{formatDateTime(viewing.sentAt ?? viewing.createdAt)}</span>
                </div>
              </DialogHeader>

              {viewing.errorMessage && (
                <p className="text-sm text-destructive">{viewing.errorMessage}</p>
              )}

              <iframe
                sandbox=""
                srcDoc={viewing.body}
                className="h-64 w-full rounded-md border"
                title="Mensagem enviada"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
