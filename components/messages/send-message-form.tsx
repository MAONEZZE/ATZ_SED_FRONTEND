"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Info, Loader2, Paintbrush, Plus, Send, Trash2 } from "lucide-react";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email-templates";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import { useEvents } from "@/lib/api/events";
import { useRegistrations } from "@/lib/api/registrations";
import { useSendMessage } from "@/lib/api/messaging";
import { useTemplates } from "@/lib/api/templates";
import {
  WHATSAPP_RECIPIENT_LIMIT,
  recipientCount,
  toSendMessageInput,
  validateManualRecipient,
  validateSendMessage,
  type SendMessageDraft,
} from "@/lib/validation/send-message";
import type { ManualRecipient, MessageChannel } from "@/lib/api/types";
import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import { PhoneField } from "@/components/forms/phone-field";
import {
  TemplateVariablesInfo,
  VARIABLE_DESCRIPTIONS,
} from "@/components/messages/template-variables-info";
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
import { VariableTextarea } from "@/components/ui/variable-textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NO_TEMPLATE = "__none__";
const NO_EVENT = "__none_event__";

export function SendMessageForm({
  eventId: fixedEventId,
  initialRegistrationId,
}: {
  eventId?: string;
  initialRegistrationId?: string;
}) {
  const { data: eventsResponse } = useEvents();
  const events = eventsResponse?.data;
  const [localEventId, setLocalEventId] = useState("");
  const effectiveEventId = fixedEventId ?? localEventId;

  const { data: registrationsResponse, isLoading: loadingRegs } =
    useRegistrations(effectiveEventId ?? "", { limit: 100 });
  const registrations = useMemo(
    () => registrationsResponse?.data ?? [],
    [registrationsResponse?.data],
  );
  const { data: templates } = useTemplates(effectiveEventId);
  const sendMessage = useSendMessage(effectiveEventId || undefined);

  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeStyle, setActiveStyle] = useState<EmailTemplateKey | null>(null);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<EmailLayoutConfig | null>(null);
  const [inviteIcs, setInviteIcs] = useState(false);
  const [inviteRecurrent, setInviteRecurrent] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [manualDraft, setManualDraft] = useState<ManualRecipient>({
    name: "",
    email: "",
    phone: "",
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    const ta = bodyTextareaRef.current;
    if (!ta) {
      setBody((prev) => prev + token);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;
    const h = iframe.contentDocument.documentElement.scrollHeight;
    if (h > 0) iframe.style.height = `${h}px`;
  }, []);

  // pré-seleção vinda do atalho da tabela de inscritos (?to=)
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialRegistrationId || registrations.length === 0)
      return;
    if (registrations.some((r) => r.id === initialRegistrationId)) {
      setSelected(new Set([initialRegistrationId]));
    }
    appliedInitial.current = true;
  }, [initialRegistrationId, registrations]);


  function applyEmailTemplate(key: EmailTemplateKey) {
    const preset = EMAIL_LAYOUT_PRESETS[key];
    setLayoutConfig(preset);
    setBody(buildEmail(preset));
    setActiveStyle(key);
  }

  const channelTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.channel === channel),
    [templates, channel],
  );
  const selectedTemplate = channelTemplates.find((t) => t.id === templateId);

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    setTemplateId(null);
    setBody("");
    setActiveStyle(null);
    setLayoutConfig(null);
    setInviteIcs(false);
    setInviteRecurrent(false);
  }

  const draft: SendMessageDraft = {
    channel,
    templateId,
    subject,
    body,
    registrationIds: Array.from(selected),
    manualRecipients,
    inviteIcs,
    inviteRecurrent,
  };
  const hasEventId = Boolean(effectiveEventId);
  const inviteEnabled = channel === "email" && hasEventId;
  const bodyIsHtml = /^<[a-zA-Z!]/.test(body.trim());
  const count = recipientCount(draft);
  const validationError = validateSendMessage(draft);

  const allSelected =
    registrations.length > 0 &&
    selected.size === registrations.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(registrations.map((r) => r.id)));
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
    sendMessage.mutate(toSendMessageInput(draft, { hasEventId }), {
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
        setActiveStyle(null);
        setLayoutConfig(null);
        setInviteIcs(false);
        setInviteRecurrent(false);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  if (loadingRegs && effectiveEventId) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {!fixedEventId && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Evento</Label>
              <Select
                value={localEventId || NO_EVENT}
                onValueChange={(v) => setLocalEventId(v === NO_EVENT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_EVENT}>Nenhum</SelectItem>
                  {events?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                <div className={channel === "email" ? "flex gap-3 items-stretch" : ""}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="send-body">Mensagem *</Label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 text-xs"
                            >
                              <Info className="h-3.5 w-3.5" />
                              Variáveis
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="max-h-[60vh] w-80 overflow-y-auto p-0"
                          >
                            <TemplateVariablesInfo />
                          </PopoverContent>
                        </Popover>
                        {channel === "email" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            disabled={!activeStyle}
                            title={
                              activeStyle
                                ? undefined
                                : "Escolha um estilo para habilitar"
                            }
                            onClick={() => setLayoutEditorOpen(true)}
                          >
                            <Paintbrush className="h-3.5 w-3.5" />
                            Editar layout
                          </Button>
                        )}
                      </div>
                    </div>

                    {bodyIsHtml ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={body}
                        title="preview do e-mail"
                        className="w-full rounded-md border"
                        style={{ minHeight: "300px" }}
                        sandbox="allow-same-origin"
                        onLoad={handleIframeLoad}
                      />
                    ) : (
                      <VariableTextarea
                        id="send-body"
                        ref={bodyTextareaRef}
                        rows={15}
                        placeholder="Escreva a mensagem..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    )}

                    {!bodyIsHtml && (
                      <div className="flex flex-wrap gap-1.5">
                        {VARIABLE_DESCRIPTIONS.map(({ variable }) => (
                          <Button
                            key={variable}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 font-mono text-xs"
                            onClick={() => insertVariable(variable)}
                          >
                            {`{{${variable}}}`}
                          </Button>
                        ))}
                      </div>
                    )}

                  </div>

                  {channel === "email" && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {/* espaçador para alinhar o 1º botão com o topo do campo Mensagem */}
                      <div className="h-[30px]" aria-hidden />
                      {(Object.keys(EMAIL_LAYOUT_PRESETS) as EmailTemplateKey[]).map((key) => (
                        <Button
                          key={key}
                          type="button"
                          variant={activeStyle === key ? "default" : "outline"}
                          size="sm"
                          className="w-28 text-xs"
                          onClick={() => applyEmailTemplate(key)}
                        >
                          {EMAIL_TEMPLATE_LABELS[key]}
                        </Button>
                      ))}

                      {/* toggles de convite (.ics) — alinhados ao fundo do campo Mensagem */}
                      <div className="mt-auto flex flex-col gap-1.5 pt-4">
                        <Button
                          type="button"
                          variant={inviteIcs ? "default" : "outline"}
                          size="sm"
                          className="w-28 text-xs"
                          aria-pressed={inviteIcs}
                          disabled={!inviteEnabled}
                          title={
                            inviteEnabled
                              ? undefined
                              : "Vincule um evento para habilitar"
                          }
                          onClick={() => {
                            setInviteIcs((v) => !v);
                            setInviteRecurrent(false);
                          }}
                        >
                          Invite
                        </Button>
                        <Button
                          type="button"
                          variant={inviteRecurrent ? "default" : "outline"}
                          size="sm"
                          className="w-28 text-xs"
                          aria-pressed={inviteRecurrent}
                          disabled={!inviteEnabled}
                          title={
                            inviteEnabled
                              ? undefined
                              : "Vincule um evento para habilitar"
                          }
                          onClick={() => {
                            setInviteRecurrent((v) => !v);
                            setInviteIcs(false);
                          }}
                        >
                          Invite Recorrente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
          {channel === "whatsapp" && (
            <p className={`text-sm ${count > WHATSAPP_RECIPIENT_LIMIT ? "text-destructive" : "text-muted-foreground"}`}>
              WhatsApp: {count}/{WHATSAPP_RECIPIENT_LIMIT} destinatários
            </p>
          )}
          {registrations.length > 0 ? (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Usar inscritos do evento ({registrations.length})
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
                    {registrations.map((r) => (
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
              <PhoneField
                className="min-w-40 flex-1"
                value={manualDraft.phone ?? ""}
                onChange={(phone) =>
                  setManualDraft((d) => ({ ...d, phone }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Adicionar destinatário"
                onClick={addManualRecipient}
                disabled={channel === "whatsapp" && count >= WHATSAPP_RECIPIENT_LIMIT}
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

      <EmailLayoutEditorModal
        open={layoutEditorOpen}
        initialConfig={layoutConfig}
        draftKey={effectiveEventId || "global"}
        onSave={(cfg, html) => {
          setLayoutConfig(cfg);
          setBody(html);
        }}
        onClose={() => setLayoutEditorOpen(false)}
      />
    </div>
  );
}
