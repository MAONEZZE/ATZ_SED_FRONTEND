import { useCallback, useState } from "react";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import type { EmailTemplateKey } from "@/lib/email-templates";
import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { MessageChannel } from "@/lib/api/types";
import { isBodyHtml } from "@/lib/messages/composer-constants";

export type EmailComposerInit = {
  channel?: MessageChannel;
  subject?: string;
  body?: string;
  activeStyle?: EmailTemplateKey | null;
  layoutConfig?: EmailLayoutConfig | null;
};

/**
 * Estado compartilhado do compositor de e-mail (canal, assunto, corpo, estilo,
 * layout e editor de layout) usado pelo formulário de envio e pelo dialog de
 * templates. Expõe apenas primitivas puras (useState) — sem React Query — para
 * poder ser renderizado em testes sem QueryClientProvider.
 *
 * Deliberadamente NÃO inclui `changeChannel` (o reset difere entre as duas
 * superfícies), seleção de template nem estado de convite — esses ficam em cada
 * consumidor.
 */
export function useEmailComposer(init?: EmailComposerInit) {
  const [channel, setChannel] = useState<MessageChannel>(init?.channel ?? "whatsapp");
  const [subject, setSubject] = useState(init?.subject ?? "");
  const [body, setBody] = useState(init?.body ?? "");
  const [activeStyle, setActiveStyle] = useState<EmailTemplateKey | null>(
    init?.activeStyle ?? null,
  );
  const [layoutConfig, setLayoutConfig] = useState<EmailLayoutConfig | null>(
    init?.layoutConfig ?? null,
  );
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  const bodyIsHtml = isBodyHtml(body);

  /**
   * Aplica um preset de tom. `opts.paragraph1` sobrescreve o parágrafo do preset
   * (o formulário de envio injeta o corpo do template selecionado; o dialog não
   * passa nada, preservando o parágrafo do preset).
   */
  const applyPreset = useCallback(
    (key: EmailTemplateKey, opts?: { paragraph1?: string }) => {
      const preset = EMAIL_LAYOUT_PRESETS[key];
      const cfg =
        opts?.paragraph1 !== undefined
          ? { ...preset, paragraph1: opts.paragraph1 }
          : preset;
      setLayoutConfig(cfg);
      setBody(buildEmail(cfg));
      setActiveStyle(key);
    },
    [],
  );

  /** Aplica o resultado do editor de layout (config + HTML gerado). */
  const applyLayout = useCallback((cfg: EmailLayoutConfig, html: string) => {
    setLayoutConfig(cfg);
    setBody(html);
  }, []);

  const openLayoutEditor = useCallback(() => setLayoutEditorOpen(true), []);
  const closeLayoutEditor = useCallback(() => setLayoutEditorOpen(false), []);

  /** Reinicia todos os campos do compositor a partir de um estado inicial. */
  const reset = useCallback((next?: EmailComposerInit) => {
    setChannel(next?.channel ?? "whatsapp");
    setSubject(next?.subject ?? "");
    setBody(next?.body ?? "");
    setActiveStyle(next?.activeStyle ?? null);
    setLayoutConfig(next?.layoutConfig ?? null);
    setLayoutEditorOpen(false);
  }, []);

  return {
    channel,
    setChannel,
    subject,
    setSubject,
    body,
    setBody,
    activeStyle,
    setActiveStyle,
    layoutConfig,
    setLayoutConfig,
    layoutEditorOpen,
    bodyIsHtml,
    applyPreset,
    applyLayout,
    openLayoutEditor,
    closeLayoutEditor,
    reset,
  };
}
