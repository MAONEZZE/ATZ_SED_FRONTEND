import { Mail, MessageCircle } from "lucide-react";
import type { MessageChannel } from "@/lib/api/types";

export function ChannelBadge({ channel }: { channel: MessageChannel }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      {channel === "whatsapp" ? (
        <MessageCircle className="h-4 w-4 text-green-600" />
      ) : (
        <Mail className="h-4 w-4 text-blue-600" />
      )}
      {channel === "whatsapp" ? "WhatsApp" : "E-mail"}
    </span>
  );
}
