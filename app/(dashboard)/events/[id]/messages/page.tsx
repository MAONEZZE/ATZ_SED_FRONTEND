"use client";

import { useParams } from "next/navigation";
import { SendMessageForm } from "@/components/messages/send-message-form";
import { LogsTab } from "@/components/messages/logs-tab";
import { TemplatesTab } from "@/components/messages/templates-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventMessagesPage() {
  const { id } = useParams<{ id: string }>();

  // Sem campo de instância: ela já vem do evento. A contagem de registros vive
  // na nav do layout do evento, por isso não há TabsList com contador aqui.
  return (
    <Tabs defaultValue="send" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="send">Enviar</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>

      <TabsContent value="send">
        <SendMessageForm eventId={id} />
      </TabsContent>
      <TabsContent value="logs">
        <LogsTab eventId={id} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab eventId={id} />
      </TabsContent>
    </Tabs>
  );
}
