import type { EmailLayoutConfig } from "@/lib/email/email-layout-config";
import type { EmailTemplateKey } from "@/lib/email-templates";
import type { MessageChannel, MessageTemplate } from "@/lib/api/types";

export interface TemplateSelection {
  body: string;
  subject: string;
  layoutConfig: EmailLayoutConfig | null;
  activeStyle: EmailTemplateKey | null;
}

export function resolveTemplateSelection(
  template: MessageTemplate | null,
  channel: MessageChannel,
): TemplateSelection {
  if (!template) {
    return { body: "", subject: "", layoutConfig: null, activeStyle: null };
  }
  const subject = channel === "email" ? (template.subject ?? "") : "";
  if (channel === "email" && template.layoutConfig) {
    return {
      body: template.body,
      subject,
      layoutConfig: template.layoutConfig,
      activeStyle: template.styleKey,
    };
  }
  return { body: template.body ?? "", subject, layoutConfig: null, activeStyle: null };
}
