"use client";

import { useState } from "react";
import type { EmailStyleResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STYLES: { key: keyof EmailStyleResponse; label: string }[] = [
  { key: "professional", label: "Profissional" },
  { key: "minimalist", label: "Minimalista" },
  { key: "elegant", label: "Elegante" },
  { key: "warm", label: "Caloroso" },
];

export function EmailStylePreview({
  styles,
  open,
  onOpenChange,
  onApply,
}: {
  styles: EmailStyleResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (html: string) => void;
}) {
  const [selected, setSelected] = useState<keyof EmailStyleResponse>("professional");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Estilos de e-mail gerados pela IA</DialogTitle>
        </DialogHeader>

        <Tabs
          value={selected}
          onValueChange={(v) => setSelected(v as keyof EmailStyleResponse)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid grid-cols-4">
            {STYLES.map(({ key, label }) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {STYLES.map(({ key }) => (
            <TabsContent key={key} value={key} className="mt-3 flex-1">
              <iframe
                srcDoc={styles[key]}
                title={key}
                className="h-[420px] w-full rounded-md border"
                sandbox=""
              />
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onApply(styles[selected]);
              onOpenChange(false);
            }}
          >
            Aplicar estilo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
