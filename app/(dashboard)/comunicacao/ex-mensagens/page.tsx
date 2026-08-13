"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, Plus } from "lucide-react";
import {
  useAllMessageLogs,
  useAllTemplates,
  useDeleteTemplateGlobal,
} from "@/lib/api/global-messaging";
import type { MessageChannel, MessageLogWithEvent, TemplateWithEvent } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format-date";
import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { SendMessageForm } from "@/components/messages/send-message-form";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MessageLogStatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableDeleteButton } from "@/components/common/data-table";
import {
  RecordCountProvider,
  useRecordCount,
  useSetRecordCount,
} from "@/components/common/record-count";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function ChannelBadge({ channel }: { channel: MessageChannel }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      {channel === "whatsapp" ? (
        <MessageCircle className="h-4 w-4 text-green-600" />
      ) : (
        <Mail className="h-4 w-4 text-blue-600" />
      )}
      {channel === "whatsapp" ? "WhatsApp" : "E-mail"}
    </span>
  );
}

function TabToolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-9 items-center justify-between">
      <div className="text-sm text-muted-foreground">{left}</div>
      <div>{right}</div>
    </div>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

const ACTIONS_HEAD = "w-[96px] text-right";

function SendTab() {
  return (
    <div className="space-y-4">
      <SendMessageForm />
    </div>
  );
}

function TemplatesTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const { data: response, isLoading } = useAllTemplates(
    page,
    pageSize,
    channelFilter === "all" ? undefined : channelFilter,
  );

  const templates = response?.data ?? [];
  useSetRecordCount(response?.total ?? 0);
  const deleteTemplate = useDeleteTemplateGlobal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithEvent | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const targets = templates.filter((t) => selected.has(t.id));
    const results = await Promise.allSettled(
      targets.map((t) => deleteTemplate.mutateAsync({ eventId: t.eventId, id: t.id })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} de ${targets.length} templates não puderam ser excluídos`);
    } else {
      toast.success(`${targets.length} template(s) excluído(s)`);
    }
    setSelected(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
  }

  return (
    <div className="space-y-4">
      <TabToolbar
        left={
          <div className="flex items-center gap-2">
            <Select
              value={channelFilter}
              onValueChange={(v) => {
                setChannelFilter(v as MessageChannel | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <DataTableDeleteButton
              selectedCount={selected.size}
              isPending={bulkDeleting}
              onDelete={() => setConfirmBulkDelete(true)}
            />
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo template
            </Button>
          </div>
        }
      />

      <DataTable
        columns={[
          { key: "name", header: "Nome", align: "left", cell: (t) => t.name },
          {
            key: "channel",
            header: "Canal",
            cell: (t) => <ChannelBadge channel={t.channel} />,
          },
          {
            key: "event",
            header: "Evento",
            cell: (t) => t.event?.title ?? "Global",
          },
        ]}
        data={templates}
        getRowId={(t) => t.id}
        isLoading={isLoading}
        emptyMessage="Nenhum template ainda."
        onRowClick={(t) => {
          setEditing(t);
          setDialogOpen(true);
        }}
        selected={selected}
        onSelectedChange={setSelected}
        total={response?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <GlobalTemplateDialog
        template={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} template(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Automações que usam esses templates podem parar de funcionar. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={bulkDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LogsTab() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: response, isLoading } = useAllMessageLogs(page, limit);
  const logs = response?.data;
  const totalPages = response ? Math.ceil(response.total / limit) : 0;
  const [viewing, setViewing] = useState<MessageLogWithEvent | null>(null);

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
              <TableHead>Evento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className={ACTIONS_HEAD}>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.length === 0 && (
              <EmptyRow cols={5} text="Nenhuma mensagem enviada ainda." />
            )}
            {logs?.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer"
                onClick={() => setViewing(log)}
              >
                <TableCell className="font-medium">{log.recipient}</TableCell>
                <TableCell>
                  <ChannelBadge channel={log.channel} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.event?.title ?? "—"}
                </TableCell>
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

      <Dialog open={viewing != null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.recipient}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ChannelBadge channel={viewing.channel} />
                  <span>{viewing.event?.title ?? "Sem evento"}</span>
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

export default function MessagesPage() {
  return (
    <RecordCountProvider>
      <MessagesPageContent />
    </RecordCountProvider>
  );
}

function MessagesPageContent() {
  const count = useRecordCount();

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Comunicação" }, { label: "Externo" }, { label: "Mensagens" }]} />
      <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="send">Enviar</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {count != null && (
            <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
              {count} {count === 1 ? "registro" : "registros"}
            </span>
          )}
        </TabsList>

        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
