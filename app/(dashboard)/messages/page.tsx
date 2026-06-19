"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useAllMessageLogs,
  useAllTemplates,
  useDeleteTemplateGlobal,
} from "@/lib/api/global-messaging";
import type { MessageChannel, TemplateWithEvent } from "@/lib/api/types";
import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { SendMessageForm } from "@/components/messages/send-message-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialogTrigger,
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

function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

function SendTab() {
  return (
    <div className="space-y-4">
      <SendMessageForm />
    </div>
  );
}

function TemplatesTab() {
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const limit = 10;
  const { data: response, isLoading } = useAllTemplates(
    page,
    limit,
    channelFilter === "all" ? undefined : channelFilter,
  );

  const templates =
    channelFilter === "all"
      ? response?.data
      : response?.data?.filter((t) => t.channel === channelFilter);
  const totalPages = response ? Math.ceil(response.total / limit) : 0;
  const deleteTemplate = useDeleteTemplateGlobal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithEvent | null>(null);

  if (isLoading) return <LoadingSpinner />;

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
            {response ? <span>{response.total} template(s)</span> : null}
          </div>
        }
        right={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo template
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead className={ACTIONS_HEAD} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates?.length === 0 && (
              <EmptyRow cols={4} text="Nenhum template ainda." />
            )}
            {templates?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <ChannelBadge channel={t.channel} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.event?.title ?? "Global"}
                </TableCell>
                <TableCell>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${t.name}`}
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${t.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Automações que usam &quot;{t.name}&quot; podem parar de
                            funcionar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                            onClick={() =>
                              deleteTemplate.mutate(
                                { eventId: t.eventId, id: t.id },
                                {
                                  onSuccess: () => toast.success("Template excluído"),
                                  onError: (e) => toast.error(e.message),
                                },
                              )
                            }
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </RowActions>
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

      <GlobalTemplateDialog
        template={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function LogsTab() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: response, isLoading } = useAllMessageLogs(page, limit);
  const logs = response?.data;
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <TabToolbar left={response ? `${response.total} mensagem(ns)` : null} />

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
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.recipient}</TableCell>
                <TableCell>
                  <ChannelBadge channel={log.channel} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.event?.title ?? "—"}
                </TableCell>
                <TableCell>
                  {log.status === "sent" ? (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Enviada
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Falhou
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(log.sentAt ?? log.createdAt).toLocaleString("pt-BR")}
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
    </div>
  );
}

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Enviar</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
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
