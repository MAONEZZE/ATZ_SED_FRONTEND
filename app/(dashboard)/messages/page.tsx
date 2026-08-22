"use client";

import { SendMessageForm } from "@/components/messages/send-message-form";
import { LogsTab } from "@/components/messages/logs-tab";
import { TemplatesTab } from "@/components/messages/templates-tab";
import { RecordCountProvider, useRecordCount } from "@/components/common/record-count";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MessagesPage() {
  return (
    <RecordCountProvider>
      <MessagesPageContent />
    </RecordCountProvider>
  );
}

function MessagesPageContent() {
  const count = useRecordCount();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="send">Enviar</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {count != null && (
            <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
              {count} {count === 1 ? "registro" : "registros"}
            </span>
          )}
        </TabsList>

        <TabsContent value="send">
          <SendMessageForm />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
