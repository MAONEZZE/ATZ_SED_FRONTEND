import { Breadcrumb } from "@/components/common/breadcrumb";

export default function IntAiChatPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "AI Chat" }]} />
      <h1 className="text-2xl font-bold tracking-tight">AI Chat</h1>
    </div>
  );
}
