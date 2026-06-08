"use client";

import type { LandingSection } from "@/lib/api/types";
import type { LandingTheme } from "@/components/landing/section-renderer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Tema vive em content.theme da seção hero (JSON livre — sem endpoint dedicado) */
export function ThemeEditor({
  sections,
  onSectionsChange,
}: {
  sections: LandingSection[];
  onSectionsChange: (sections: LandingSection[]) => void;
}) {
  const hero = sections.find((s) => s.type === "hero");
  if (!hero) return null;

  const theme: LandingTheme =
    hero.content?.theme && typeof hero.content.theme === "object"
      ? (hero.content.theme as LandingTheme)
      : {};

  function setTheme(patch: Partial<LandingTheme>) {
    onSectionsChange(
      sections.map((s) =>
        s.id === hero!.id
          ? { ...s, content: { ...(s.content ?? {}), theme: { ...theme, ...patch } } }
          : s,
      ),
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <h4 className="font-medium">Tema</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="theme-primary" className="text-xs">
            Cor primária
          </Label>
          <Input
            id="theme-primary"
            type="color"
            className="h-9 p-1"
            value={theme.primaryColor ?? "#756D45"}
            onChange={(e) => setTheme({ primaryColor: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-bg" className="text-xs">
            Cor de fundo
          </Label>
          <Input
            id="theme-bg"
            type="color"
            className="h-9 p-1"
            value={theme.backgroundColor ?? "#ffffff"}
            onChange={(e) => setTheme({ backgroundColor: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-text" className="text-xs">
            Cor do texto
          </Label>
          <Input
            id="theme-text"
            type="color"
            className="h-9 p-1"
            value={theme.textColor ?? "#1a1a1a"}
            onChange={(e) => setTheme({ textColor: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-font" className="text-xs">
            Fonte (CSS)
          </Label>
          <Input
            id="theme-font"
            placeholder="Inter, sans-serif"
            value={theme.fontFamily ?? ""}
            onChange={(e) => setTheme({ fontFamily: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="theme-css" className="text-xs">
          CSS customizado
        </Label>
        <Textarea
          id="theme-css"
          rows={4}
          className="font-mono text-xs"
          placeholder=".hero { ... }"
          value={theme.customCss ?? ""}
          onChange={(e) => setTheme({ customCss: e.target.value })}
        />
      </div>
    </div>
  );
}
