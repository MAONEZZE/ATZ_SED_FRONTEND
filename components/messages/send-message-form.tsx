"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { type EmailTemplateKey } from "@/lib/email-templates";
import { useEvents } from "@/lib/api/events";
import { useEvolutionInstances } from "@/lib/api/evolution-instances";
import { useRegistrations } from "@/lib/api/registrations";
import { useSendMessage, useUploadAttachment } from "@/lib/api/messaging";
import { useAllTemplates } from "@/lib/api/global-messaging";
import { useProfile } from "@/lib/api/profile";
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
import { parseRecipientsCsv } from "@/lib/utils/parse-recipients-csv";
import { CsvImportModal } from "@/components/common/csv-import-modal";
import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
import { ToneSegmentedControl } from "@/components/messages/tone-segmented-control";
import { WhatsAppGroupsPopover } from "@/components/messages/send-message/whatsapp-groups-popover";
import { SendSummaryRail } from "@/components/messages/send-message/send-summary-rail";
import { RecipientTable } from "@/components/messages/send-message/recipient-table";
import { MessageBodyEditor } from "@/components/messages/send-message/message-body-editor";
import { ManualRecipientPopover } from "@/components/messages/send-message/manual-recipient-popover";
import { ManualRecipientList } from "@/components/messages/send-message/manual-recipient-list";
import { resolveTemplateSelection } from "@/lib/messages/resolve-template-selection";
import {
  NO_EVENT,
  NO_INSTANCE,
  NO_TEMPLATE,
  STEP_LABEL_CLASS,
  TONE_OPTIONS,
} from "@/lib/messages/composer-constants";
import { ATTACHMENT_MAX_SIZE, isAcceptedAttachment } from "@/lib/messages/attachments";
import { useEmailComposer } from "@/hooks/use-email-composer";
import { useIframeAutosize } from "@/hooks/use-iframe-autosize";
import { useVariableInsertion } from "@/hooks/use-variable-insertion";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const { data: evolutionInstances } = useEvolutionInstances();
  const [instanceId, setInstanceId] = useState("");
  const selectedInstance = evolutionInstances?.find((i) => i.id === instanceId);

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
  const uploadAttachment = useUploadAttachment();

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

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

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
  }

  const draft: SendMessageDraft = {
    channel,
    templateId,
    subject,
    body,
    registrationIds: Array.from(selected),
    manualRecipients,
    instanceId,
    attachments,
  };
  const hasEventId = Boolean(effectiveEventId);
  const count = recipientCount(draft);
  const validationError = validateSendMessage(draft, { hasEventId });
  const bodyEmpty = !body.trim();

  const selectedEvent = events?.find((e) => e.id === effectiveEventId);
  const attachmentsBytes = attachments.reduce((sum, a) => sum + a.size, 0);

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

  function importCsv(file: File) {
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
        toast.error(`"${file.name}" excede 25MB e foi ignorado.`);
        continue;
      }
      if (!isAcceptedAttachment(file)) {
        toast.error(`Tipo de arquivo não suportado: "${file.name}".`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    try {
      const uploaded = await Promise.all(
        accepted.map((file) => uploadAttachment.mutateAsync(file)),
      );
      setAttachments((prev) => [...prev, ...uploaded]);
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

            <div className="space-y-2">
              <Label>Instância</Label>
              <Select
                value={instanceId || NO_INSTANCE}
                onValueChange={(v) => setInstanceId(v === NO_INSTANCE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INSTANCE}>Sem instância</SelectItem>
                  {evolutionInstances?.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <MessageBodyEditor
              channel={channel}
              body={body}
              onBodyChange={setBody}
              bodyIsHtml={bodyIsHtml}
              iframeRef={iframeRef}
              onIframeLoad={handleIframeLoad}
              bodyTextareaRef={bodyTextareaRef}
              onInsertVariable={insertVariable}
              activeStyle={activeStyle}
              attachments={attachments}
              onRemoveAttachment={(index) =>
                setAttachments((prev) => prev.filter((_, i) => i !== index))
              }
              attachInputRef={attachInputRef}
              onAddAttachments={(files) => void addAttachments(files)}
              onOpenLayoutEditor={openLayoutEditor}
            />
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
              {channel === "whatsapp" && <WhatsAppGroupsPopover />}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setCsvModalOpen(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Importar CSV
              </Button>
              <ManualRecipientPopover
                open={manualOpen}
                onOpenChange={setManualOpen}
                draft={manualDraft}
                setDraft={setManualDraft}
                onAdd={addManualRecipient}
                addDisabled={
                  channel === "whatsapp" && count >= WHATSAPP_RECIPIENT_LIMIT
                }
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {channel === "whatsapp" && (
              <p
                className={`text-sm ${count > WHATSAPP_RECIPIENT_LIMIT ? "text-destructive" : "text-muted-foreground"}`}
              >
                WhatsApp: {count}/{WHATSAPP_RECIPIENT_LIMIT} destinatários
              </p>
            )}

            <RecipientTable
              registrations={visibleRegistrations}
              selected={selected}
              allSelected={allSelected}
              onToggleAll={toggleAll}
              onToggleOne={toggleOne}
              statusFilter={statusFilter}
              onToggleStatusFilter={toggleStatusFilter}
              onClearStatusFilter={() => setStatusFilter(new Set())}
              hasEvent={Boolean(effectiveEventId)}
            />

            <ManualRecipientList
              recipients={manualRecipients}
              onRemove={(index) =>
                setManualRecipients((prev) => prev.filter((_, i) => i !== index))
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Rail direito — Resumo do envio */}
      <SendSummaryRail
        channel={channel}
        eventTitle={selectedEvent?.title}
        instanceLabel={selectedInstance?.nickname}
        count={count}
        attachmentCount={attachments.length}
        attachmentsBytes={attachmentsBytes}
        onSend={onSend}
        onSendTest={onSendTest}
        isSending={sendMessage.isPending}
        sendingTest={sendingTest}
        bodyEmpty={bodyEmpty}
      />

      <CsvImportModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onFile={importCsv}
      />

      <EmailLayoutEditorModal
        open={layoutEditorOpen}
        initialConfig={layoutConfig}
        draftKey={effectiveEventId || "global"}
        onSave={applyLayout}
        onClose={closeLayoutEditor}
      />
    </div>
  );
}
