"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, Send, User } from "lucide-react";
import { streamLandingChat } from "@/lib/api/ai";
import type { LandingSection } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

/**
 * Tenta extrair um JSON de mudanças da resposta da IA e aplicar nas seções.
 * Formato esperado: { "sections": [{ "id"|"type", "enabled"?, "order"?, "content"? }] }
 */
function tryApplyAiChanges(
  text: string,
  sections: LandingSection[],
): LandingSection[] | null {
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/)?.[1] ??
    (text.trim().startsWith("{") ? text.trim() : null);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch) as {
      sections?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed.sections)) return null;

    let changed = false;
    const next = sections.map((section) => {
      const patch = parsed.sections!.find(
        (p) => p.id === section.id || p.type === section.type,
      );
      if (!patch) return section;
      changed = true;
      return {
        ...section,
        enabled:
          typeof patch.enabled === "boolean" ? patch.enabled : section.enabled,
        order: typeof patch.order === "number" ? patch.order : section.order,
        content:
          patch.content && typeof patch.content === "object"
            ? { ...(section.content ?? {}), ...(patch.content as object) }
            : section.content,
      };
    });
    return changed ? next : null;
  } catch {
    return null;
  }
}

export function AiChatPanel({
  sections,
  onSectionsChange,
}: {
  sections: LandingSection[];
  onSectionsChange: (sections: LandingSection[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function send() {
    const message = input.trim();
    if (!message || streaming) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: message },
      { role: "assistant", text: "" },
    ]);
    setStreaming(true);
    scrollToBottom();

    let fullText = "";
    await streamLandingChat({
      message,
      landing: { sections },
      onChunk: (chunk) => {
        fullText += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: fullText };
          return next;
        });
        scrollToBottom();
      },
      onError: (error) => {
        toast.error(`Chat IA: ${error.message}`);
        setStreaming(false);
      },
      onDone: () => {
        setStreaming(false);
        const updated = tryApplyAiChanges(fullText, sections);
        if (updated) {
          onSectionsChange(updated);
          toast.success("Mudanças da IA aplicadas no preview");
        }
      },
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Bot className="h-4 w-4 text-primary" />
          Assistente IA
        </h3>
        <p className="text-xs text-muted-foreground">
          Peça mudanças na landing: seções, textos, cores...
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-3 p-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ex.: &quot;Deixe o hero mais chamativo e desative a galeria&quot;
            </p>
          )}
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex gap-2 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "assistant" && (
                <Bot className="mt-1 h-4 w-4 shrink-0 text-primary" />
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.text ||
                  (streaming && i === messages.length - 1 ? "..." : "")}
              </div>
              {message.role === "user" && (
                <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          rows={2}
          value={input}
          placeholder="Sua instrução..."
          className="resize-none"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={streaming || !input.trim()}
          aria-label="Enviar mensagem"
        >
          {streaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
