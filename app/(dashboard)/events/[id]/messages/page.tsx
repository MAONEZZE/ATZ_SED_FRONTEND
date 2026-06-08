"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Radio,
  Send,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useDeleteTemplate, useTemplatesWithAutomation } from "@/lib/api/templates";
import { useUpdateAutomation, TRIGGER_LABELS } from "@/lib/api/automations";
import { useMessageLogs, useMessageLogsStream } from "@/lib/api/messaging";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MessageChannel,
  MessageLog,
  MessageTemplate,
} from "@/lib/api/types";
import { TemplateEditorDialog } from "@/components/messages/template-editor-dialog";
import { SendMessageForm } from "@/components/messages/send-message-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function ChannelIcon({ channel }: { channel: "whatsapp" | "email" }) {
  return channel === "whatsapp" ? (
    <MessageCircle className="h-4 w-4 text-green-600" />
  ) : (
    <Mail className="h-4 w-4 text-blue-600" />
  );
}

function TemplatesTab({ eventId }: { eventId: string }) {
  const { data: templates, isLoading } = useTemplatesWithAutomation(eventId);
  const deleteTemplate = useDeleteTemplate(eventId);
  const updateAutomation = useUpdateAutomation(eventId);
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  function toggleAutomation(automationId: string, active: boolean) {
    updateAutomation.mutate(
      { id: automationId, input: { active } },
      {
        onSuccess: () => {
          // cards de template carregam o resumo da automação — invalida ambos
          void queryClient.invalidateQueries({
            queryKey: queryKeys.templates(eventId),
          });
          toast.success(active ? "Automação ativada" : "Automação desativada");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo template
        </Button>
      </div>

      {templates?.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Send className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Nenhum template</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie templates para usar em automações e envios.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <ChannelIcon channel={template.channel} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{template.name}</p>
                  {template.automation && (
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {TRIGGER_LABELS[template.automation.trigger]}
                    </Badge>
                  )}
                </div>
                {template.subject && (
                  <p className="text-sm text-muted-foreground">
                    Assunto: {template.subject}
                  </p>
                )}
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                  {template.body}
                </p>
              </div>
              {template.automation && (
                <Switch
                  checked={template.automation.active}
                  disabled={updateAutomation.isPending}
                  onCheckedChange={(active) =>
                    toggleAutomation(template.automation!.id, active)
                  }
                  aria-label={`Ativar/desativar automação de ${template.name}`}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${template.name}`}
                onClick={() => {
                  setEditing(template);
                  setEditorOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${template.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Automações que usam &quot;{template.name}&quot; podem parar
                      de funcionar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() =>
                        deleteTemplate.mutate(template.id, {
                          onSuccess: () => toast.success("Template excluído"),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>

      <TemplateEditorDialog
        eventId={eventId}
        template={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}

function LogsTab({ eventId }: { eventId: string }) {
  const { data: seedLogs, isLoading } = useMessageLogs(eventId);
  const { liveLogs, connected } = useMessageLogsStream(eventId);
  const [channelFilter, setChannelFilter] = useState<"all" | MessageChannel>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">(
    "all",
  );

  // stream sobrepõe o seed quando ativo (backend manda os 20 mais recentes)
  const logs = useMemo<MessageLog[]>(() => {
    let merged: MessageLog[];
    if (liveLogs) {
      const seen = new Set(liveLogs.map((l) => l.id));
      const older = (seedLogs ?? []).filter((l) => !seen.has(l.id));
      merged = [...liveLogs, ...older];
    } else {
      merged = seedLogs ?? [];
    }
    return merged.filter(
      (l) =>
        (channelFilter === "all" || l.channel === channelFilter) &&
        (statusFilter === "all" || l.status === statusFilter),
    );
  }, [liveLogs, seedLogs, channelFilter, statusFilter]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio
            className={`h-4 w-4 ${connected ? "animate-pulse text-green-600" : ""}`}
          />
          {connected ? "Ao vivo" : "Reconectando..."}
        </div>

        <div className="ml-auto flex gap-2">
          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v as "all" | MessageChannel)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as "all" | "sent" | "failed")
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviadas</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Send className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Nenhuma mensagem enviada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os envios das automações aparecem aqui em tempo real.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <ChannelIcon channel={log.channel} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{log.recipient}</p>
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
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.sentAt ?? log.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                  {log.body}
                </p>
                {log.errorMessage && (
                  <p className="mt-1 text-sm text-destructive">{log.errorMessage}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MessagesPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const eventId = params.id;
  // atalho da tabela de inscritos: abre a aba Enviar com o inscrito marcado
  const initialRegistrationId = searchParams.get("to") ?? undefined;

  return (
    <Tabs
      defaultValue={initialRegistrationId ? "send" : "templates"}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="send">Enviar</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="logs">Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="send">
        <SendMessageForm
          eventId={eventId}
          initialRegistrationId={initialRegistrationId}
        />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab eventId={eventId} />
      </TabsContent>
      <TabsContent value="logs">
        <LogsTab eventId={eventId} />
      </TabsContent>
    </Tabs>
  );
}

export default function MessagesPage() {
  // useSearchParams exige Suspense boundary no App Router
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MessagesPageInner />
    </Suspense>
  );
}
