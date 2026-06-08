"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import type { LandingSection } from "@/lib/api/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  about: "Sobre",
  registration: "Inscrição",
  speakers: "Palestrantes",
  schedule: "Programação",
  venue: "Local",
  faq: "FAQ",
  gallery: "Galeria",
  testimonials: "Depoimentos",
  sponsors: "Patrocinadores",
};

/** Campos simples por tipo (o restante via JSON avançado) */
const SIMPLE_FIELDS: Record<string, { key: string; label: string; textarea?: boolean }[]> = {
  hero: [
    { key: "headline", label: "Título" },
    { key: "subheadline", label: "Subtítulo", textarea: true },
    { key: "ctaLabel", label: "Texto do botão" },
  ],
  about: [
    { key: "title", label: "Título" },
    { key: "text", label: "Texto", textarea: true },
  ],
  registration: [
    { key: "title", label: "Título" },
    { key: "successMessage", label: "Mensagem de sucesso", textarea: true },
  ],
  venue: [
    { key: "title", label: "Título" },
    { key: "address", label: "Endereço" },
    { key: "mapEmbedUrl", label: "URL do mapa (embed)" },
  ],
  speakers: [{ key: "title", label: "Título" }],
  schedule: [{ key: "title", label: "Título" }],
  faq: [{ key: "title", label: "Título" }],
  gallery: [{ key: "title", label: "Título" }],
  testimonials: [{ key: "title", label: "Título" }],
  sponsors: [{ key: "title", label: "Título" }],
};

function SectionEditorCard({
  section,
  index,
  total,
  onChange,
  onMove,
}: {
  section: LandingSection;
  index: number;
  total: number;
  onChange: (patch: Partial<LandingSection>) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const fields = SIMPLE_FIELDS[section.type] ?? [];
  const content = section.content ?? {};

  function setContentKey(key: string, value: string) {
    onChange({ content: { ...content, [key]: value } });
  }

  function openJson() {
    setJsonDraft(JSON.stringify(content, null, 2));
    setJsonError(null);
    setJsonOpen(true);
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      onChange({ content: parsed });
      setJsonOpen(false);
      setJsonError(null);
    } catch {
      setJsonError("JSON inválido");
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate font-medium">
            {SECTION_LABELS[section.type] ?? section.type}
          </span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === 0}
          aria-label="Mover para cima"
          onClick={() => onMove(-1)}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === total - 1}
          aria-label="Mover para baixo"
          onClick={() => onMove(1)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>

        <Switch
          checked={section.enabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
          aria-label={`Habilitar seção ${SECTION_LABELS[section.type] ?? section.type}`}
        />
      </div>

      {expanded && (
        <div className="space-y-3 border-t p-3">
          {fields.map(({ key, label, textarea }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`${section.id}-${key}`} className="text-xs">
                {label}
              </Label>
              {textarea ? (
                <Textarea
                  id={`${section.id}-${key}`}
                  rows={3}
                  value={typeof content[key] === "string" ? (content[key] as string) : ""}
                  onChange={(e) => setContentKey(key, e.target.value)}
                />
              ) : (
                <Input
                  id={`${section.id}-${key}`}
                  value={typeof content[key] === "string" ? (content[key] as string) : ""}
                  onChange={(e) => setContentKey(key, e.target.value)}
                />
              )}
            </div>
          ))}

          {!jsonOpen ? (
            <Button type="button" variant="ghost" size="sm" onClick={openJson}>
              <Settings2 className="mr-2 h-3.5 w-3.5" />
              Editar JSON avançado
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={applyJson}>
                  Aplicar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setJsonOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionEditorList({
  sections,
  onSectionsChange,
}: {
  sections: LandingSection[];
  onSectionsChange: (sections: LandingSection[]) => void;
}) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);

  function updateSection(id: string, patch: Partial<LandingSection>) {
    onSectionsChange(
      sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function moveSection(id: string, direction: -1 | 1) {
    const index = ordered.findIndex((s) => s.id === id);
    const target = ordered[index + direction];
    if (!target) return;
    const current = ordered[index];
    onSectionsChange(
      sections.map((s) => {
        if (s.id === current.id) return { ...s, order: target.order };
        if (s.id === target.id) return { ...s, order: current.order };
        return s;
      }),
    );
  }

  return (
    <div className="space-y-2">
      {ordered.map((section, index) => (
        <SectionEditorCard
          key={section.id}
          section={section}
          index={index}
          total={ordered.length}
          onChange={(patch) => updateSection(section.id, patch)}
          onMove={(direction) => moveSection(section.id, direction)}
        />
      ))}
    </div>
  );
}
