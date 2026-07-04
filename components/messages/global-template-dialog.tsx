"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Braces, ChevronDown, LayoutTemplate, Loader2 } from "lucide-react";
import {
  useCreateTemplateGlobal,
  useUpdateTemplateGlobal,
} from "@/lib/api/global-messaging";
import { useEvents } from "@/lib/api/events";
import type { MessageChannel, TemplateWithEvent } from "@/lib/api/types";
import {
  EMAIL_PREVIEW_MIN_HEIGHT,
  NO_EVENT,
  STEP_LABEL_CLASS,
  TONE_OPTIONS,
} from "@/lib/messages/composer-constants";
import { useEmailComposer } from "@/hooks/use-email-composer";
import { useIframeAutosize } from "@/hooks/use-iframe-autosize";
import { useVariableInsertion } from "@/hooks/use-variable-insertion";
import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
import { ToneSegmentedControl } from "@/components/messages/tone-segmented-control";
import { VARIABLE_DESCRIPTIONS } from "@/components/messages/template-variables-info";
import {
  INVITE_TOKEN,
  hasInviteToken,
  injectInviteToken,
  removeInviteToken,
} from "@/lib/validation/send-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: TemplateWithEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateTemplateGlobal();
  const update = useUpdateTemplateGlobal();
  const { data: eventsResponse } = useEvents();
  const events = eventsResponse?.data;

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
    reset,
  } = composer;
  const { iframeRef, onLoad: handleIframeLoad } = useIframeAutosize();
  const { textareaRef: bodyRef, insertVariable } = useVariableInsertion(body, setBody);

  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setEventId(template?.eventId ?? "");
      reset({
        channel: template?.channel ?? "whatsapp",
        subject: template?.subject ?? "",
        body: template?.body ?? "",
        activeStyle: template?.styleKey ?? null,
        layoutConfig: template?.layoutConfig ?? null,
      });
    }
  }, [open, template, reset]);

  const isPending = create.isPending || update.isPending;
  const isEdit = Boolean(template);

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    if (next !== "email") {
      setBody("");
      setActiveStyle(null);
      setLayoutConfig(null);
    }
  }

  function handleSave() {
    if (!name.trim() || !body.trim()) {
      toast.error("Nome e corpo da mensagem são obrigatórios");
      return;
    }
    const input = {
      name: name.trim(),
      channel,
      subject: channel === "email" ? subject.trim() || undefined : undefined,
      body,
      layoutConfig: channel === "email" ? layoutConfig : null,
      styleKey: channel === "email" ? activeStyle : null,
      eventId: eventId || null,
    };
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? "Template atualizado" : "Template criado");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    // Endpoint global (/templates/:id) resolve por id + ownerId e aplica o eventId
    // do input (vincula/desvincula), então roteamos sempre por ele.
    if (template) update.mutate({ eventId: null, id: template.id, input }, onDone);
    else create.mutate({ input }, onDone);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1 · Configuração */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={STEP_LABEL_CLASS}>1 · Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Evento</Label>
                <Select
                  value={eventId || NO_EVENT}
                  onValueChange={(v) => setEventId(v === NO_EVENT ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Global (sem evento)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_EVENT}>Global (sem evento)</SelectItem>
                    {events?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gtpl-name">Nome do template *</Label>
                  <Input
                    id="gtpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

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
                  onValueChange={applyPreset}
                  options={TONE_OPTIONS}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="gtpl-subject">Assunto</Label>
                  <Input
                    id="gtpl-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="gtpl-body">Mensagem *</Label>
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

                    {channel === "email" && (
                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id="gtpl-invite"
                            checked={hasInviteToken(body, INVITE_TOKEN)}
                            onCheckedChange={(checked) =>
                              setBody(
                                checked
                                  ? injectInviteToken(body, INVITE_TOKEN)
                                  : removeInviteToken(body, INVITE_TOKEN),
                              )
                            }
                          />
                          <Label htmlFor="gtpl-invite" className="text-xs font-normal">
                            Enviar convite do evento
                          </Label>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          disabled={!activeStyle}
                          title={activeStyle ? undefined : "Escolha um tom para habilitar"}
                          onClick={openLayoutEditor}
                        >
                          <LayoutTemplate className="h-3.5 w-3.5" />
                          Editar layout
                        </Button>
                      </div>
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
                      id="gtpl-body"
                      ref={bodyRef}
                      rows={12}
                      placeholder="Escreva a mensagem..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="rounded-none border-0 shadow-none focus-visible:ring-0"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>

      {layoutEditorOpen && (
        <EmailLayoutEditorModal
          open={layoutEditorOpen}
          initialConfig={layoutConfig}
          draftKey={`gtpl-${template?.id ?? "new"}`}
          onSave={(cfg, html) => {
            applyLayout(cfg, html);
            closeLayoutEditor();
          }}
          onClose={closeLayoutEditor}
        />
      )}
    </Dialog>
  );
}
