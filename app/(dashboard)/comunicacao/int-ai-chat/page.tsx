import { Breadcrumb } from "@/components/common/breadcrumb";

export default function IntAiChatPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Comunicação" }, { label: "Interno" }, { label: "AI Chat" }]} />
      <h1 className="text-2xl font-bold tracking-tight">Página AI Chat Interno</h1>
    </div>
  );
}
