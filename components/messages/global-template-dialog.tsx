"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Info, Paintbrush } from "lucide-react";
import { TEMPLATE_VARIABLES } from "@/lib/api/templates";
import {
  INVITE_TOKEN,
  INVITE_RECURRENT_TOKEN,
  injectInviteToken,
  removeInviteToken,
  hasInviteToken,
} from "@/lib/validation/send-message";
import {
  useCreateTemplateGlobal,
  useUpdateTemplateGlobal,
} from "@/lib/api/global-messaging";
import type { MessageChannel, TemplateWithEvent } from "@/lib/api/types";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/email-templates";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import { EmailLayoutEditorModal } from "@/components/messages/email-layout-editor/email-layout-editor-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { Badge } from "@/components/ui/badge";
import { TemplateVariablesInfo } from "@/components/messages/template-variables-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeStyle, setActiveStyle] = useState<EmailTemplateKey | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<EmailLayoutConfig | null>(null);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setChannel(template?.channel ?? "whatsapp");
      setSubject(template?.subject ?? "");
      setBody(template?.body ?? "");
      setLayoutConfig(template?.layoutConfig ?? null);
      setActiveStyle(template?.styleKey ?? null);
      setLayoutEditorOpen(false);
    }
  }, [open, template]);

  const isPending = create.isPending || update.isPending;
  const isEdit = Boolean(template);
  const bodyIsHtml = /^<[a-zA-Z!]/.test(body.trim());

  const inviteIcs = hasInviteToken(body, INVITE_TOKEN);
  const inviteRecurrent = hasInviteToken(body, INVITE_RECURRENT_TOKEN);

  function toggleInvite(token: string) {
    setBody((prev) => {
      const other = token === INVITE_TOKEN ? INVITE_RECURRENT_TOKEN : INVITE_TOKEN;
      let next = removeInviteToken(prev, other);
      next = hasInviteToken(prev, token)
        ? removeInviteToken(next, token)
        : injectInviteToken(next, token);
      return next;
    });
  }

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function applyPreset(key: EmailTemplateKey) {
    const cfg = EMAIL_LAYOUT_PRESETS[key];
    setLayoutConfig(cfg);
    setBody(buildEmail(cfg));
    setActiveStyle(key);
  }

  function changeChannel(next: MessageChannel) {
    setChannel(next);
    if (next !== "email") {
      setBody("");
      setActiveStyle(null);
      setLayoutConfig(null);
    }
  }

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;
    const doc = iframe.contentDocument;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    if (h > 0) iframe.style.height = `${h + 4}px`;
  }, []);

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
    };
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? "Template atualizado" : "Template criado");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (template)
      update.mutate({ eventId: template.eventId, id: template.id, input }, onDone);
    else create.mutate({ input }, onDone);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gtpl-name">Nome *</Label>
            <Input
              id="gtpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="gtpl-body">Mensagem *</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto gap-1.5 px-2 py-1 text-xs text-muted-foreground"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Variáveis disponíveis
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 overflow-hidden p-0">
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
                    title={activeStyle ? undefined : "Escolha um estilo para habilitar"}
                    onClick={() => setLayoutEditorOpen(true)}
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                    Editar layout
                  </Button>
                )}
              </div>
            </div>

            {channel === "email" && (
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(EMAIL_LAYOUT_PRESETS) as EmailTemplateKey[]).map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant={activeStyle === key ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => applyPreset(key)}
                  >
                    {EMAIL_TEMPLATE_LABELS[key]}
                  </Button>
                ))}
              </div>
            )}

            {channel === "email" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Vincular:</span>
                <Button
                  type="button"
                  variant={inviteIcs ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  aria-pressed={inviteIcs}
                  onClick={() => toggleInvite(INVITE_TOKEN)}
                >
                  Invite
                </Button>
                <Button
                  type="button"
                  variant={inviteRecurrent ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  aria-pressed={inviteRecurrent}
                  onClick={() => toggleInvite(INVITE_RECURRENT_TOKEN)}
                >
                  Invite Recorrente
                </Button>
              </div>
            )}

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
                id="gtpl-body"
                ref={bodyRef}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            )}

            {!bodyIsHtml && (
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    aria-label={`Inserir variável ${variable}`}
                  >
                    <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
                      {`{{${variable}}}`}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
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
          setLayoutConfig(cfg);
          setBody(html);
          setLayoutEditorOpen(false);
        }}
          onClose={() => setLayoutEditorOpen(false)}
        />
      )}
    </Dialog>
  );
}
