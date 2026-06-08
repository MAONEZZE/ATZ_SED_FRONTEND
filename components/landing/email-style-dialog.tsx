"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { generateEmailStyles } from "@/lib/api/ai";
import type { EmailStyleResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STYLE_LABELS: Record<keyof EmailStyleResponse, string> = {
  professional: "Profissional",
  minimalist: "Minimalista",
  elegant: "Elegante",
  warm: "Acolhedor",
};

export function EmailStyleDialog({ defaultContent }: { defaultContent: string }) {
  const [content, setContent] = useState(defaultContent);
  const [result, setResult] = useState<EmailStyleResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (content.trim().length < 10) {
      toast.error("Descreva o evento (mín. 10 caracteres)");
      return;
    }
    setLoading(true);
    try {
      setResult(await generateEmailStyles(content.trim()));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao gerar estilos",
      );
    } finally {
      setLoading(false);
    }
  }

  function copyHtml(html: string) {
    void navigator.clipboard.writeText(html);
    toast.success("HTML copiado!");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Estilo de e-mail (IA)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerar estilo de e-mail com IA</DialogTitle>
          <DialogDescription>
            Gera 4 variantes de HTML de e-mail a partir da descrição do evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="email-style-content">Descrição do evento</Label>
          <Textarea
            id="email-style-content"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button onClick={generate} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Gerar
          </Button>
        </div>

        {result && (
          <Tabs defaultValue="professional" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              {(Object.keys(STYLE_LABELS) as (keyof EmailStyleResponse)[]).map(
                (key) => (
                  <TabsTrigger key={key} value={key}>
                    {STYLE_LABELS[key]}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
            {(Object.keys(STYLE_LABELS) as (keyof EmailStyleResponse)[]).map(
              (key) => (
                <TabsContent key={key} value={key} className="space-y-2">
                  <iframe
                    srcDoc={result[key]}
                    className="h-96 w-full rounded-lg border bg-white"
                    title={`Preview ${STYLE_LABELS[key]}`}
                    sandbox=""
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyHtml(result[key])}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copiar HTML
                  </Button>
                </TabsContent>
              ),
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
