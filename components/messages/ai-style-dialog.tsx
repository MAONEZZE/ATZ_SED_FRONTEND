"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AiStyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  loading: boolean;
  onGenerate: (variables: string, content?: string) => void;
}

export function AiStyleDialog({
  open,
  onOpenChange,
  initialContent = "",
  loading,
  onGenerate,
}: AiStyleDialogProps) {
  const [variables, setVariables] = useState("");
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (open) setContent(initialContent ?? "");
  }, [open, initialContent]);

  function handleGenerate() {
    if (!variables.trim()) return;
    onGenerate(variables.trim(), content.trim() || undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar e-mail com IA</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="ai-variables">
              Variáveis do template{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ai-variables"
              rows={3}
              placeholder="{{nome}}: nome do convidado; {{evento}}: nome do evento; {{data}}: data e horário; {{local}}: endereço"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Formato:{" "}
              <code className="font-mono text-xs">{"{{variavel}}: descrição"}</code>,
              separadas por{" "}
              <code className="font-mono text-xs">;</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-content">
              Conteúdo base{" "}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Textarea
              id="ai-content"
              rows={4}
              placeholder="Cole aqui o conteúdo base do e-mail. Se vazio, a IA cria o conteúdo automaticamente a partir das variáveis."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={!variables.trim() || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Gerar estilos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
