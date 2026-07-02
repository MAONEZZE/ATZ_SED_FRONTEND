"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Braces,
  ChevronDown,
  Download,
  LayoutTemplate,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Ticket,
  Trash2,
} from "lucide-react";
import { type EmailTemplateKey } from "@/lib/email-templates";
import { useEvents } from "@/lib/api/events";
import { useRegistrations } from "@/lib/api/registrations";
import { useSendMessage } from "@/lib/api/messaging";
import { useAllTemplates } from "@/lib/api/global-messaging";
import { useProfile } from "@/lib/api/profile";
import {
  INVITE_TOKEN,
  INVITE_RECURRENT_TOKEN,
  removeInviteToken,
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
import {
  type InviteConfig,
  describeInvite,
  isRecurrentInvite,
} from "@/lib/messages/invite-config";
import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
import { InviteConfigModal } from "@/components/messages/invite-config-modal";
import { ToneSegmentedControl } from "@/components/messages/tone-segmented-control";
import { WhatsAppGroupsPopover } from "@/components/messages/send-message/whatsapp-groups-popover";
import { resolveTemplateSelection } from "@/lib/messages/resolve-template-selection";
import {
  EMAIL_PREVIEW_MIN_HEIGHT,
  NO_EVENT,
  NO_TEMPLATE,
  STEP_LABEL_CLASS,
  TONE_OPTIONS,
} from "@/lib/messages/composer-constants";
import {
  ATTACHMENT_MAX_SIZE,
  base64Bytes,
  formatBytes,
  readAsAttachment,
} from "@/lib/messages/attachments";
import { useEmailComposer } from "@/hooks/use-email-composer";
import { useIframeAutosize } from "@/hooks/use-iframe-autosize";
import { useVariableInsertion } from "@/hooks/use-variable-insertion";
import { PhoneField } from "@/components/forms/phone-field";
import { VARIABLE_DESCRIPTIONS } from "@/components/messages/template-variables-info";
import { FunnelStatusBadge } from "@/components/common/status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
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

  const composer = useEmailComposer();
  const {
    channel,
    setChannel,
    subject,
    setSubject,
    body,
    setBody,
    activeStyle,
    setActiveStyle,
    layoutConfig,
    setLayoutConfig,
    layoutEditorOpen,
    bodyIsHtml,
    applyPreset,
    applyLayout,
    openLayoutEditor,
    closeLayoutEditor,
  } = composer;
  const { iframeRef, onLoad: handleIframeLoad } = useIframeAutosize();
  const { textareaRef: bodyTextareaRef, insertVariable } = useVariableInsertion(
    body,
    setBody,
  );

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [inviteIcs, setInviteIcs] = useState(false);
  const [inviteRecurrent, setInviteRecurrent] = useState(false);
  const [inviteConfig, setInviteConfig] = useState<InviteConfig | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualRecipient>({
    name: "",
    email: "",
    phone: "",
  });
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [sendingTest, setSendingTest] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function saveInvite(config: InviteConfig) {
    setInviteConfig(config);
    const recurrent = isRecurrentInvite(config.recurrence);
    setInviteIcs(!recurrent);
    setInviteRecurrent(recurrent);
    // Em texto plano, mostra o token no editor. Em HTML, o token é injetado antes
    // de </body> pelo toSendMessageInput no envio (não há textarea no preview).
    if (!bodyIsHtml) {
      const token = recurrent ? INVITE_RECURRENT_TOKEN : INVITE_TOKEN;
      setBody((prev) => {
        let next = removeInviteToken(prev, INVITE_TOKEN);
        next = removeInviteToken(next, INVITE_RECURRENT_TOKEN);
        return `${next.trimEnd()}\n${token}`.trimStart();
      });
    }
  }

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
    applyPreset(key, selectedTemplate ? { paragraph1: selectedTemplate.body } : undefined);
  }

  function selectTemplate(value: string) {
    const id = value === NO_TEMPLATE ? null : value;
    setTemplateId(id);
    const tpl = id ? (channelTemplates.find((t) => t.id === id) ?? null) : null;
    const sel = resolveTemplateSelection(tpl, channel);
    if (channel === "email") setSubject(sel.subject);
    setLayoutConfig(sel.layoutConfig);
    setActiveStyle(sel.activeStyle);
    setBody(sel.body);
  }

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    setTemplateId(null);
    setBody("");
    setSubject("");
    setActiveStyle(null);
    setLayoutConfig(null);
    setInviteIcs(false);
    setInviteRecurrent(false);
    setInviteConfig(null);
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
    inviteConfig,
    attachments,
  };
  const hasEventId = Boolean(effectiveEventId);
  const count = recipientCount(draft);
  const validationError = validateSendMessage(draft);
  const bodyEmpty = !body.trim();

  const selectedEvent = events?.find((e) => e.id === effectiveEventId);
  const attachmentsBytes = attachments.reduce(
    (sum, a) => sum + base64Bytes(a.contentBase64),
    0,
  );

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
    setManualOpen(false);
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

  function resetAfterSend() {
    setAttachments([]);
    setBody("");
    setSubject("");
    setTemplateId(null);
    setActiveStyle(null);
    setLayoutConfig(null);
    setInviteIcs(false);
    setInviteRecurrent(false);
    setInviteConfig(null);
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
        resetAfterSend();
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function onSendTest() {
    if (bodyEmpty) {
      toast.error("Escreva a mensagem antes de enviar um teste.");
      return;
    }
    if (channel !== "email") {
      toast.error("Envio de teste disponível apenas para e-mail.");
      return;
    }
    if (!profile?.email) {
      toast.error("Seu perfil não tem e-mail para o teste.");
      return;
    }
    const testDraft: SendMessageDraft = {
      ...draft,
      registrationIds: [],
      manualRecipients: [{ name: profile.name, email: profile.email }],
    };
    setSendingTest(true);
    sendMessage.mutate(toSendMessageInput(testDraft, { hasEventId }), {
      onSuccess: () => toast.success(`Teste enviado para ${profile.email}`),
      onError: (e) => toast.error(e.message),
      onSettled: () => setSendingTest(false),
    });
  }

  if (loadingRegs && effectiveEventId) return <LoadingSpinner />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Coluna principal */}
      <div className="space-y-4">
        {/* 1 · Configuração */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={STEP_LABEL_CLASS}>1 · Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!fixedEventId && (
              <div className="space-y-2">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </CardContent>
        </Card>

        {/* 2 · Conteúdo */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className={STEP_LABEL_CLASS}>2 · Conteúdo</CardTitle>
            {channel === "email" && (
              <ToneSegmentedControl
                aria-label="Tom da mensagem"
                value={activeStyle}
                onValueChange={applyEmailTemplate}
                options={TONE_OPTIONS}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {channel === "email" && (
              <div className="space-y-2">
                <Label htmlFor="send-subject">Assunto</Label>
                <Input
                  id="send-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="send-body">Mensagem *</Label>
              <div className="overflow-hidden rounded-md border">
                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b bg-muted/40 px-1.5 py-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <Braces className="h-3.5 w-3.5" />
                        Variáveis
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="max-h-[60vh] w-64 overflow-y-auto"
                    >
                      {VARIABLE_DESCRIPTIONS.map(({ variable, description }) => (
                        <DropdownMenuItem
                          key={variable}
                          onSelect={() => insertVariable(variable)}
                          className="flex-col items-start gap-0.5"
                        >
                          <code className="font-mono text-xs font-semibold">
                            {`{{${variable}}}`}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {description}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => attachInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Anexo
                  </Button>

                  {channel === "email" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setInviteModalOpen(true)}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Invite
                      {inviteConfig && (
                        <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Button>
                  )}

                  {channel === "email" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 gap-1 px-2 text-xs"
                      disabled={!activeStyle}
                      title={activeStyle ? undefined : "Escolha um tom para habilitar"}
                      onClick={openLayoutEditor}
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      Editar layout
                    </Button>
                  )}
                </div>

                {bodyIsHtml ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={body}
                    title="preview do e-mail"
                    scrolling="no"
                    className="block w-full overflow-hidden bg-white"
                    style={{ minHeight: EMAIL_PREVIEW_MIN_HEIGHT }}
                    sandbox="allow-same-origin"
                    onLoad={handleIframeLoad}
                  />
                ) : (
                  <VariableTextarea
                    id="send-body"
                    ref={bodyTextareaRef}
                    rows={12}
                    placeholder="Escreva a mensagem..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="rounded-none border-0 shadow-none focus-visible:ring-0"
                  />
                )}
              </div>

              <input
                ref={attachInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void addAttachments(e.target.files)}
              />

              {attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {attachments.map((a, index) => (
                    <li
                      key={`${a.filename}-${index}`}
                      className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-xs"
                    >
                      <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="max-w-[160px] truncate">{a.filename}</span>
                      <button
                        type="button"
                        aria-label={`Remover ${a.filename}`}
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3 · Destinatários */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className={STEP_LABEL_CLASS}>3 · Destinatários</CardTitle>
            <div className="flex items-center gap-1.5">
              {manualRecipients.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setManualRecipients([])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
              {channel === "whatsapp" && (
                <WhatsAppGroupsPopover evolutionInstance={profile?.evolutionInstance} />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => csvInputRef.current?.click()}
              >
                <Download className="h-3.5 w-3.5" />
                Importar CSV
              </Button>
              <Popover open={manualOpen} onOpenChange={setManualOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" className="h-7 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar manual
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-2">
                  <p className="text-sm font-medium">Adicionar destinatário</p>
                  <Input
                    placeholder="Nome"
                    value={manualDraft.name}
                    onChange={(e) =>
                      setManualDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="nome@email.com"
                    type="email"
                    value={manualDraft.email}
                    onChange={(e) =>
                      setManualDraft((d) => ({ ...d, email: e.target.value }))
                    }
                  />
                  {channel === "whatsapp" ? (
                    <Input
                      placeholder="+5511999999999 ou 120363@g.us"
                      value={manualDraft.phone ?? ""}
                      onChange={(e) =>
                        setManualDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                    />
                  ) : (
                    <PhoneField
                      value={manualDraft.phone ?? ""}
                      onChange={(phone) => setManualDraft((d) => ({ ...d, phone }))}
                    />
                  )}
                  <Button
                    type="button"
                    className="w-full gap-1.5"
                    onClick={addManualRecipient}
                    disabled={channel === "whatsapp" && count >= WHATSAPP_RECIPIENT_LIMIT}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => importCsv(e.target.files?.[0])}
            />

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
          </CardContent>
        </Card>
      </div>

      {/* Rail direito — Resumo do envio */}
      <aside className="lg:sticky lg:top-4 lg:h-fit">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo do envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Canal">
              {channel === "email" ? "E-mail" : "WhatsApp"}
            </SummaryRow>
            <SummaryRow label="Evento">{selectedEvent?.title ?? "—"}</SummaryRow>
            <SummaryRow label="Destinatários">
              <span className="font-medium">{count}</span>
            </SummaryRow>
            <SummaryRow label="Anexos">
              {attachments.length > 0
                ? `${attachments.length} · ${formatBytes(attachmentsBytes)}`
                : "—"}
            </SummaryRow>
            <SummaryRow label="Invite">
              {inviteConfig ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setInviteModalOpen(true)}
                  title={describeInvite(inviteConfig)}
                >
                  Configurado
                </button>
              ) : (
                "—"
              )}
            </SummaryRow>

            <Separator />

            <Button
              className="w-full gap-2"
              onClick={onSend}
              disabled={count === 0 || bodyEmpty || sendMessage.isPending}
            >
              {sendMessage.isPending && !sendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar para {count}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onSendTest}
              disabled={sendMessage.isPending || channel !== "email"}
              title={
                channel === "email" ? undefined : "Teste disponível apenas para e-mail"
              }
            >
              {sendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar teste para mim
            </Button>
          </CardContent>
        </Card>
      </aside>

      <EmailLayoutEditorModal
        open={layoutEditorOpen}
        initialConfig={layoutConfig}
        draftKey={effectiveEventId || "global"}
        onSave={applyLayout}
        onClose={closeLayoutEditor}
      />

      <InviteConfigModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        initial={inviteConfig}
        onSave={saveInvite}
      />
    </div>
  );
}
