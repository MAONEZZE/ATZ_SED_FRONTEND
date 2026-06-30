import { Info } from "lucide-react";

export const VARIABLE_DESCRIPTIONS: { variable: string; description: string }[] = [
  { variable: "nome", description: "Nome completo do inscrito" },
  { variable: "email", description: "E-mail do inscrito" },
  { variable: "telefone", description: "Telefone do inscrito (ex: +5511999999999)" },
  { variable: "evento", description: "Título do evento" },
  { variable: "data", description: "Data e hora do evento" },
  { variable: "local", description: "Local / endereço do evento" },
  { variable: "capacidade", description: "Capacidade total de vagas do evento" },
  { variable: "dress_code", description: "Dress code do evento" },
  {
    variable: "link_grupo",
    description: "Link do grupo de comunicação (WhatsApp/Telegram)",
  },
  { variable: "invite", description: "Convite de calendário do evento (.ics)" },
  {
    variable: "invite_recorrente",
    description: "Convite de calendário recorrente do evento",
  },
];

export function TemplateVariablesInfo() {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="mb-2 flex items-center gap-1.5 font-medium text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Variáveis disponíveis
      </p>
      <ul className="space-y-1">
        {VARIABLE_DESCRIPTIONS.map(({ variable, description }) => (
          <li key={variable} className="flex flex-wrap items-baseline gap-x-2">
            <code className="rounded bg-background px-1 py-0.5 font-mono text-xs font-semibold text-foreground">
              {`{{${variable}}}`}
            </code>
            <span className="text-muted-foreground">{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
