"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  Copy,
  Info,
  Loader2,
  Paintbrush,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email-templates";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import { useEvents } from "@/lib/api/events";
import { useRegistrations } from "@/lib/api/registrations";
import { useSendMessage } from "@/lib/api/messaging";
import { useAllTemplates } from "@/lib/api/global-messaging";
import { useProfile, useWhatsAppGroups } from "@/lib/api/profile";
import {
  WHATSAPP_RECIPIENT_LIMIT,
  recipientCount,
  toSendMessageInput,
  validateManualRecipient,
  validateSendMessage,
  type SendMessageDraft,
} from "@/lib/validation/send-message";
import type {
  FunnelStatus,
  ManualRecipient,
  MessageAttachment,
  MessageChannel,
} from "@/lib/api/types";
import { funnelStatusConfig } from "@/lib/utils/status-maps";
import { parseRecipientsCsv } from "@/lib/utils/parse-recipients-csv";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NO_TEMPLATE = "__none__";
const NO_EVENT = "__none_event__";
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

function readAsAttachment(file: File): Promise<MessageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  });
}

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

  const [statusFilter, setStatusFilter] = useState<Set<FunnelStatus>>(new Set());

  const { data: registrationsResponse, isLoading: loadingRegs } = useRegistrations(
    effectiveEventId ?? "",
    { limit: 100 },
  );
  const registrations = useMemo(
    () => registrationsResponse?.data ?? [],
    [registrationsResponse?.data],
  );
  const visibleRegistrations = useMemo(
    () =>
      statusFilter.size === 0
        ? registrations
        : registrations.filter((r) => statusFilter.has(r.status)),
    [registrations, statusFilter],
  );

  function toggleStatusFilter(s: FunnelStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const { data: templatesResponse } = useAllTemplates(1, 100);
  const templates = templatesResponse?.data;
  const sendMessage = useSendMessage(effectiveEventId || undefined);

  const { data: profile } = useProfile();
  const {
    data: groups,
    isLoading: loadingGroups,
    isError: groupsError,
  } = useWhatsAppGroups();
  const [groupsOpen, setGroupsOpen] = useState(false);

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
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

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
    const doc = iframe.contentDocument;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    if (h > 0) iframe.style.height = `${h + 4}px`;
  }, []);

  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialRegistrationId || registrations.length === 0)
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

  function applyEmailTemplate(key: EmailTemplateKey) {
    const preset = EMAIL_LAYOUT_PRESETS[key];

    const cfg = selectedTemplate
      ? { ...preset, paragraph1: selectedTemplate.body }
      : preset;
    setLayoutConfig(cfg);
    setBody(buildEmail(cfg));
    setActiveStyle(key);
  }

  function selectTemplate(value: string) {
    const id = value === NO_TEMPLATE ? null : value;
    setTemplateId(id);
    const tpl = id ? channelTemplates.find((t) => t.id === id) : null;
    if (channel === "email") setSubject(tpl?.subject ?? "");
    if (channel === "email" && layoutConfig) {
      const cfg = {
        ...layoutConfig,
        paragraph1: tpl?.body ?? layoutConfig.paragraph1,
      };
      setLayoutConfig(cfg);
      setBody(buildEmail(cfg));
    } else {
      setBody(tpl?.body ?? "");
    }
  }

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
    attachments,
  };
  const hasEventId = Boolean(effectiveEventId);
  const inviteEnabled = channel === "email" && hasEventId;
  const bodyIsHtml = /^<[a-zA-Z!]/.test(body.trim());
  const count = recipientCount(draft);
  const validationError = validateSendMessage(draft);

  const allSelected =
    visibleRegistrations.length > 0 &&
    visibleRegistrations.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = visibleRegistrations.map((r) => r.id);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
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

  function importCsv(file: File | undefined) {
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { recipients, skipped } = parseRecipientsCsv(reader.result as string);

      if (recipients.length === 0) {
        toast.error(
          "Nenhum destinatário válido no CSV (verifique colunas Nome, Email, Telefone).",
        );
        return;
      }
      setManualRecipients((prev) => [...prev, ...recipients]);
      toast.success(
        `${recipients.length} destinatário(s) importado(s)` +
          (skipped > 0 ? `, ${skipped} ignorado(s)` : ""),
      );
    };
    reader.onerror = () => toast.error("Falha ao ler o CSV");
    reader.readAsText(file);
  }

  async function addAttachments(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    if (attachInputRef.current) attachInputRef.current.value = "";
    if (list.length === 0) return;
    const accepted: File[] = [];
    for (const file of list) {
      if (file.size > ATTACHMENT_MAX_SIZE) {
        toast.error(`"${file.name}" excede 10MB e foi ignorado.`);
        continue;
      }
      accepted.push(file);
    }
    try {
      const read = await Promise.all(accepted.map(readAsAttachment));
      setAttachments((prev) => [...prev, ...read]);
    } catch {
      toast.error("Falha ao anexar arquivo(s).");
    }
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
        setAttachments([]);
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
            <Select value={templateId ?? NO_TEMPLATE} onValueChange={selectTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>Sem template (mensagem livre)</SelectItem>
                {channelTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <div className={channel === "email" ? "flex items-stretch gap-3" : ""}>
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
                            activeStyle ? undefined : "Escolha um estilo para habilitar"
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
                      scrolling="no"
                      className="block w-full overflow-hidden rounded-md border"
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
                    <div className="h-[30px]" aria-hidden />
                    {(Object.keys(EMAIL_LAYOUT_PRESETS) as EmailTemplateKey[]).map(
                      (key) => (
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
                      ),
                    )}

                    <div className="mt-auto flex flex-col gap-1.5 pt-4">
                      <Button
                        type="button"
                        variant={inviteIcs ? "default" : "outline"}
                        size="sm"
                        className="w-28 text-xs"
                        aria-pressed={inviteIcs}
                        disabled={!inviteEnabled}
                        title={
                          inviteEnabled ? undefined : "Vincule um evento para habilitar"
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
                          inviteEnabled ? undefined : "Vincule um evento para habilitar"
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

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <Label className="shrink-0">Anexo</Label>
                <span className="truncate text-[11px] text-muted-foreground">
                  Documentos enviados junto à mensagem (e-mail e WhatsApp). Máx. 10MB por
                  arquivo.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-xs"
                onClick={() => attachInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Anexar documento
              </Button>
            </div>
            <input
              ref={attachInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void addAttachments(e.target.files)}
            />
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((a, index) => (
                  <li
                    key={`${a.filename}-${index}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{a.filename}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Remover ${a.filename}`}
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== index))
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

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Destinatários</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setManualRecipients([])}
            disabled={manualRecipients.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar destinatários
          </Button>
          <Badge variant="secondary">{count} selecionado(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {channel === "whatsapp" && (
            <p
              className={`text-sm ${count > WHATSAPP_RECIPIENT_LIMIT ? "text-destructive" : "text-muted-foreground"}`}
            >
              WhatsApp: {count}/{WHATSAPP_RECIPIENT_LIMIT} destinatários
            </p>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      disabled={visibleRegistrations.length === 0}
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
                        <p className="px-1 pb-1 text-xs text-muted-foreground">
                          Mostrar status
                        </p>
                        {(Object.keys(funnelStatusConfig) as FunnelStatus[]).map((s) => (
                          <label
                            key={s}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={statusFilter.has(s)}
                              onCheckedChange={() => toggleStatusFilter(s)}
                            />
                            {funnelStatusConfig[s].label}
                          </label>
                        ))}
                        {statusFilter.size > 0 && (
                          <button
                            type="button"
                            className="mt-1 w-full rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                            onClick={() => setStatusFilter(new Set())}
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
                {visibleRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {!effectiveEventId
                        ? "Vincule um evento para listar os inscritos, ou adicione destinatários manualmente."
                        : statusFilter.size > 0
                          ? "Nenhum inscrito com esse status."
                          : "Nenhum inscrito ainda — adicione destinatários manualmente."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRegistrations.map((r) => (
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Adicionar destinatários manualmente</Label>
              <div className="flex items-center gap-2">
                {channel === "whatsapp" && (
                  <Popover open={groupsOpen} onOpenChange={setGroupsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Verificar Grupos
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0">
                      <div className="border-b px-3 py-2">
                        <p className="text-sm font-medium">Grupos WhatsApp</p>
                        {profile?.evolutionInstance && (
                          <p className="text-xs text-muted-foreground">
                            Instância: {profile.evolutionInstance}
                          </p>
                        )}
                      </div>
                      {!profile?.evolutionInstance ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">
                          Configure sua instância Evolution no perfil para ver os grupos.
                        </p>
                      ) : loadingGroups ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : groupsError ? (
                        <p className="px-3 py-4 text-sm text-destructive">
                          Erro ao carregar grupos. Verifique a instância Evolution.
                        </p>
                      ) : !groups || groups.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">
                          Nenhum grupo encontrado.
                        </p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {groups.map((g) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {g.subject}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                aria-label={`Copiar ID do grupo ${g.subject}`}
                                onClick={() => {
                                  navigator.clipboard.writeText(g.id);
                                  toast.success("ID copiado para a área de transferência");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importar CSV
                </Button>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => importCsv(e.target.files?.[0])}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Nome"
                className="min-w-32 flex-1"
                value={manualDraft.name}
                onChange={(e) => setManualDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <Input
                placeholder="nome@email.com"
                type="email"
                className="min-w-40 flex-1"
                value={manualDraft.email}
                onChange={(e) => setManualDraft((d) => ({ ...d, email: e.target.value }))}
              />
              {channel === "whatsapp" ? (
                <Input
                  placeholder="+5511999999999 ou 120363@g.us"
                  className="min-w-40 flex-1"
                  value={manualDraft.phone ?? ""}
                  onChange={(e) =>
                    setManualDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                />
              ) : (
                <PhoneField
                  className="min-w-40 flex-1"
                  value={manualDraft.phone ?? ""}
                  onChange={(phone) => setManualDraft((d) => ({ ...d, phone }))}
                />
              )}
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
                        setManualRecipients((prev) => prev.filter((_, i) => i !== index))
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
        <Button onClick={onSend} disabled={count === 0 || sendMessage.isPending}>
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
