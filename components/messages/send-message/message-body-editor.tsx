"use client";

import type { RefObject } from "react";
import { Braces, ChevronDown, LayoutTemplate, Paperclip } from "lucide-react";
import type { MessageAttachment, MessageChannel } from "@/lib/api/types";
import { VARIABLE_DESCRIPTIONS } from "@/components/messages/template-variables-info";
import { EmailBodyPreview } from "@/components/messages/send-message/email-body-preview";
import { AttachmentList } from "@/components/messages/send-message/attachment-list";
import { ATTACHMENT_ACCEPT } from "@/lib/messages/attachments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Editor do corpo da mensagem: toolbar (variáveis, anexo, layout),
 * preview HTML ou textarea, input de arquivo e lista de anexos.
 */
export function MessageBodyEditor({
  channel,
  body,
  onBodyChange,
  bodyIsHtml,
  iframeRef,
  onIframeLoad,
  bodyTextareaRef,
  onInsertVariable,
  activeStyle,
  attachments,
  onRemoveAttachment,
  attachInputRef,
  onAddAttachments,
  onOpenLayoutEditor,
}: {
  channel: MessageChannel;
  body: string;
  onBodyChange: (value: string) => void;
  bodyIsHtml: boolean;
  iframeRef: RefObject<HTMLIFrameElement>;
  onIframeLoad: () => void;
  bodyTextareaRef: RefObject<HTMLTextAreaElement>;
  onInsertVariable: (variable: string) => void;
  activeStyle: string | null;
  attachments: MessageAttachment[];
  onRemoveAttachment: (index: number) => void;
  attachInputRef: RefObject<HTMLInputElement>;
  onAddAttachments: (files: FileList | null) => void;
  onOpenLayoutEditor: () => void;
}) {
  return (
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
                  onSelect={() => onInsertVariable(variable)}
                  className="flex-col items-start gap-0.5"
                >
                  <code className="font-mono text-xs font-semibold">
                    {`{{${variable}}}`}
                  </code>
                  <span className="text-xs text-muted-foreground">{description}</span>
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
              className="ml-auto h-7 gap-1 px-2 text-xs"
              disabled={!activeStyle}
              title={activeStyle ? undefined : "Escolha um tom para habilitar"}
              onClick={onOpenLayoutEditor}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Editar layout
            </Button>
          )}
        </div>

        {bodyIsHtml ? (
          <EmailBodyPreview body={body} iframeRef={iframeRef} onLoad={onIframeLoad} />
        ) : (
          <VariableTextarea
            id="send-body"
            ref={bodyTextareaRef}
            rows={12}
            placeholder="Escreva a mensagem..."
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="rounded-none border-0 shadow-none focus-visible:ring-0"
          />
        )}
      </div>

      <input
        ref={attachInputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => onAddAttachments(e.target.files)}
      />

      <AttachmentList attachments={attachments} onRemove={onRemoveAttachment} />
    </div>
  );
}
