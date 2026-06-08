"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  TEMPLATE_VARIABLES,
  useCreateTemplate,
  useUpdateTemplate,
} from "@/lib/api/templates";
import type { MessageChannel, MessageTemplate } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export function TemplateEditorDialog({
  eventId,
  template,
  open,
  onOpenChange,
}: {
  eventId: string;
  /** null = criar novo */
  template: MessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateTemplate(eventId);
  const update = useUpdateTemplate(eventId);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setChannel(template?.channel ?? "whatsapp");
      setSubject(template?.subject ?? "");
      setBody(template?.body ?? "");
    }
  }, [open, template]);

  const isPending = create.isPending || update.isPending;

  /** Insere {{variável}} na posição do cursor do body */
  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
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
    };
    const onDone = {
      onSuccess: () => {
        toast.success(template ? "Template atualizado" : "Template criado");
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (template) update.mutate({ id: template.id, input }, onDone);
    else create.mutate(input, onDone);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Nome *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as MessageChannel)}
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
              <Label htmlFor="tpl-subject">Assunto</Label>
              <Input
                id="tpl-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tpl-body">Mensagem *</Label>
            <Textarea
              id="tpl-body"
              ref={bodyRef}
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  aria-label={`Inserir variável ${variable}`}
                >
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent"
                  >
                    {`{{${variable}}}`}
                  </Badge>
                </button>
              ))}
            </div>
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
    </Dialog>
  );
}
