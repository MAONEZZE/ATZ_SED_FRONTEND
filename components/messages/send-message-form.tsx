"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useRegistrations } from "@/lib/api/registrations";
import { useSendMessage } from "@/lib/api/messaging";
import { useTemplates } from "@/lib/api/templates";
import {
  recipientCount,
  toSendMessageInput,
  validateManualRecipient,
  validateSendMessage,
  type SendMessageDraft,
} from "@/lib/validation/send-message";
import type { ManualRecipient, MessageChannel } from "@/lib/api/types";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";

const NO_TEMPLATE = "__none__";

export function SendMessageForm({
  eventId,
  initialRegistrationId,
}: {
  eventId: string;
  initialRegistrationId?: string;
}) {
  const { data: registrations, isLoading: loadingRegs } =
    useRegistrations(eventId);
  const { data: templates } = useTemplates(eventId);
  const sendMessage = useSendMessage(eventId);

  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [manualDraft, setManualDraft] = useState<ManualRecipient>({
    name: "",
    email: "",
    phone: "",
  });

  // pré-seleção vinda do atalho da tabela de inscritos (?to=)
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialRegistrationId || !registrations)
      return;
    if (registrations.some((r) => r.id === initialRegistrationId)) {
      setSelected(new Set([initialRegistrationId]));
    }
    appliedInitial.current = true;
  }, [initialRegistrationId, registrations]);

  const channelTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.channel === channel),
    [templates, channel],
  );
  const selectedTemplate = channelTemplates.find((t) => t.id === templateId);

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    // template do canal anterior deixa de valer
    setTemplateId(null);
  }

  const draft: SendMessageDraft = {
    channel,
    templateId,
    subject,
    body,
    registrationIds: Array.from(selected),
    manualRecipients,
  };
  const count = recipientCount(draft);
  const validationError = validateSendMessage(draft);

  const allSelected =
    (registrations?.length ?? 0) > 0 &&
    selected.size === registrations?.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set((registrations ?? []).map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addManualRecipient() {
    const recipient: ManualRecipient = {
      name: manualDraft.name.trim(),
      email: manualDraft.email?.trim() || undefined,
      phone: manualDraft.phone?.trim() || undefined,
    };
    const error = validateManualRecipient(recipient, channel);
    if (error) {
      toast.error(error);
      return;
    }
    setManualRecipients((prev) => [...prev, recipient]);
    setManualDraft({ name: "", email: "", phone: "" });
  }

  function onSend() {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    sendMessage.mutate(toSendMessageInput(draft), {
      onSuccess: (result) => {
        toast.success(
          `${result.queued} mensagem(ns) enfileirada(s)` +
            (result.skipped > 0 ? `, ${result.skipped} ignorada(s)` : ""),
        );
        result.skippedReason?.forEach((reason) => toast.warning(reason));
        setSelected(new Set());
        setManualRecipients([]);
        setBody("");
        setSubject("");
        setTemplateId(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  if (loadingRegs) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <Select
              value={channel}
              onValueChange={(v) => changeChannel(v as MessageChannel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template de mensagem</Label>
            <Select
              value={templateId ?? NO_TEMPLATE}
              onValueChange={(v) =>
                setTemplateId(v === NO_TEMPLATE ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>
                  Sem template (mensagem livre)
                </SelectItem>
                {channelTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Prévia do template</Label>
              <p className="whitespace-pre-line rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                {selectedTemplate.body}
              </p>
            </div>
          ) : (
            <>
              {channel === "email" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="send-subject">Assunto</Label>
                  <Input
                    id="send-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="send-body">Mensagem *</Label>
                <Textarea
                  id="send-body"
                  rows={5}
                  placeholder="Escreva a mensagem..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Destinatários</CardTitle>
          <Badge variant="secondary">{count} selecionado(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {(registrations?.length ?? 0) > 0 ? (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Usar inscritos do evento ({registrations!.length})
              </label>

              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations!.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => toggleOne(r.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={() => toggleOne(r.id)}
                            aria-label={`Selecionar ${r.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.email}
                        </TableCell>
                        <TableCell>
                          <FunnelStatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum inscrito ainda — adicione destinatários manualmente.
            </p>
          )}

          <div className="space-y-2">
            <Label>Adicionar destinatários manualmente</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Nome"
                className="min-w-32 flex-1"
                value={manualDraft.name}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
              <Input
                placeholder="nome@email.com"
                type="email"
                className="min-w-40 flex-1"
                value={manualDraft.email}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, email: e.target.value }))
                }
              />
              <Input
                placeholder="+55 11 99999-9999"
                type="tel"
                className="min-w-40 flex-1"
                value={manualDraft.phone}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, phone: e.target.value }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Adicionar destinatário"
                onClick={addManualRecipient}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {manualRecipients.length > 0 && (
              <ul className="space-y-1">
                {manualRecipients.map((r, index) => (
                  <li
                    key={`${r.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <span>
                      <span className="font-medium">{r.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {[r.email, r.phone].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Remover ${r.name}`}
                      onClick={() =>
                        setManualRecipients((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onSend}
          disabled={count === 0 || sendMessage.isPending}
        >
          {sendMessage.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Enviar mensagem ({count})
        </Button>
      </div>
    </div>
  );
}
