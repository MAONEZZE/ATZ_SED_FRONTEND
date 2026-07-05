"use client";

import { Loader2, Send } from "lucide-react";
import type { MessageChannel } from "@/lib/api/types";
import { formatBytes } from "@/lib/messages/attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Rail lateral com o resumo do envio e os botões de enviar / enviar teste. */
export function SendSummaryRail({
  channel,
  eventTitle,
  count,
  attachmentCount,
  attachmentsBytes,
  onSend,
  onSendTest,
  isSending,
  sendingTest,
  bodyEmpty,
}: {
  channel: MessageChannel;
  eventTitle?: string;
  count: number;
  attachmentCount: number;
  attachmentsBytes: number;
  onSend: () => void;
  onSendTest: () => void;
  isSending: boolean;
  sendingTest: boolean;
  bodyEmpty: boolean;
}) {
  return (
    <aside className="lg:sticky lg:top-4 lg:h-fit">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo do envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SummaryRow label="Canal">
            {channel === "email" ? "E-mail" : "WhatsApp"}
          </SummaryRow>
          <SummaryRow label="Evento">{eventTitle ?? "—"}</SummaryRow>
          <SummaryRow label="Destinatários">
            <span className="font-medium">{count}</span>
          </SummaryRow>
          <SummaryRow label="Anexos">
            {attachmentCount > 0
              ? `${attachmentCount} · ${formatBytes(attachmentsBytes)}`
              : "—"}
          </SummaryRow>
          <Separator />

          <Button
            className="w-full gap-2"
            onClick={onSend}
            disabled={count === 0 || bodyEmpty || isSending}
          >
            {isSending && !sendingTest ? (
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
            disabled={isSending || channel !== "email"}
            title={channel === "email" ? undefined : "Teste disponível apenas para e-mail"}
          >
            {sendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar teste para mim
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
