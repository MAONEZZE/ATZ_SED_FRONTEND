"use client";

import { useState } from "react";
import { useMessageLogs } from "@/lib/api/global-messaging";
import type { MessageLogWithEvent } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format-date";
import { ChannelBadge } from "@/components/messages/channel-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MessageLogStatusBadge } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/data-table";
import { DEFAULT_PAGE_SIZE, PageSizeSelect } from "@/components/common/page-size-select";
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data: response, isLoading } = useMessageLogs({
    eventId,
    page,
    limit: pageSize,
  });
  const logs = response?.data;
  const totalPages = response ? Math.max(1, Math.ceil(response.total / pageSize)) : 1;
  const [viewing, setViewing] = useState<MessageLogWithEvent | null>(null);
  const cols = eventId ? 4 : 5;

  useSetRecordCount(response?.total ?? 0);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex h-9 items-center justify-end">
        <PageSizeSelect
          value={pageSize}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <Table containerClassName="max-h-[60vh] rounded-xl border">
        <TableHeader>
          <TableRow>
            <TableHead>Destinatário</TableHead>
            <TableHead>Canal</TableHead>
            {!eventId && <TableHead>Evento</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-[96px] text-right">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
