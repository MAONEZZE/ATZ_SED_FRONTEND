"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { ChevronDown, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildEmail } from "@/lib/email/build-email";
import { DEFAULTS, type EmailLayoutConfig } from "@/lib/email/email-layout-config";
import { EDITOR_SCHEMA, type EditorField } from "./editor-schema";
import { FieldRenderer } from "./editor-fields";

type FieldValue = string | number | boolean;

export interface EmailLayoutEditorModalProps {
  open: boolean;

  initialConfig: EmailLayoutConfig | null;

  draftKey?: string;
  onSave: (config: EmailLayoutConfig, html: string) => void | Promise<void>;
  onClose: () => void;
}

const eq = (a: EmailLayoutConfig, b: EmailLayoutConfig) =>
  JSON.stringify(a) === JSON.stringify(b);

function toRows(fields: EditorField[]): EditorField[][] {
  const rows: EditorField[][] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const next = fields[i + 1];
    if (f.half && next?.half) {
      rows.push([f, next]);
      i++;
    } else {
      rows.push([f]);
    }
  }
  return rows;
}

export function EmailLayoutEditorModal({
  open,
  initialConfig,
  draftKey,
  onSave,
  onClose,
}: EmailLayoutEditorModalProps) {
  const baseline = useMemo<EmailLayoutConfig>(
    () => ({ ...DEFAULTS, ...(initialConfig ?? {}) }),
    [initialConfig],
  );

  const [config, setConfig] = useState<EmailLayoutConfig>(baseline);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(EDITOR_SCHEMA.filter((s) => s.defaultOpen).map((s) => s.id)),
  );
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<EmailLayoutConfig | null>(null);

  const storageKey = draftKey ? `email-layout-draft:${draftKey}` : null;
  const ready = useRef(false);

  useEffect(() => {
    if (!open) {
      ready.current = false;
      return;
    }
    setConfig(baseline);
    setSaving(false);
    setConfirmDiscard(false);
    setConfirmReset(false);
    setDraftPrompt(null);
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const draft = { ...DEFAULTS, ...JSON.parse(raw) } as EmailLayoutConfig;
          if (!eq(draft, baseline)) setDraftPrompt(draft);
        }
      } catch {}
    }

    const t = setTimeout(() => {
      ready.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [open, baseline, storageKey]);

  useEffect(() => {
    if (!open || !ready.current || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
    } catch {}
  }, [config, open, storageKey]);

  const dirty = !eq(config, baseline);

  const setField = useCallback((key: keyof EmailLayoutConfig, value: FieldValue) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const attemptClose = useCallback(() => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }, [dirty, onClose]);

  function clearDraft() {
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(config, buildEmail(config));
      clearDraft();
      toast.success("Layout salvo");
      onClose();
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig({ ...DEFAULTS });
    setConfirmReset(false);
    toast.success("Valores originais restaurados");
  }

  const previewHtml = useMemo(() => buildEmail(config), [config]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) attemptClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            attemptClose();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-background shadow-xl",
            "h-[100dvh] w-screen rounded-none",
            "sm:h-[92vh] sm:max-h-[860px] sm:w-[94vw] sm:max-w-[1200px] sm:rounded-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
            <DialogPrimitive.Title className="text-base font-semibold">
              Editar layout do email
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar original
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={attemptClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="max-h-[45%] w-full shrink-0 overflow-y-auto border-b p-4 lg:max-h-none lg:w-[330px] lg:border-b-0 lg:border-r">
              <div className="space-y-2">
                {EDITOR_SCHEMA.map((section) => {
                  const isOpen = openSections.has(section.id);
                  return (
                    <div key={section.id} className="rounded-lg border">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-widest"
                      >
                        <span className="flex items-center gap-2">
                          {isOpen && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                          {section.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="space-y-4 px-3 pb-4 pt-1">
                          {section.groups.map((group, gi) => (
                            <div key={gi} className="space-y-3">
                              {group.label && (
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                                  {group.label}
                                </p>
                              )}
                              {toRows(group.fields).map((row, ri) => (
                                <div
                                  key={ri}
                                  className={cn(
                                    row.length === 2 && "grid grid-cols-2 gap-2",
                                  )}
                                >
                                  {row.map((field) => (
                                    <FieldRenderer
                                      key={field.key}
                                      field={field}
                                      value={config[field.key]}
                                      onChange={(v) => setField(field.key, v)}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-neutral-200/60 p-6 dark:bg-neutral-900">
              <iframe
                title="Pré-visualização do email"
                srcDoc={previewHtml}
                sandbox="allow-same-origin"
                className="h-full w-full max-w-[640px] rounded-lg border bg-white shadow-md"
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
            <Button variant="outline" onClick={attemptClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As alterações não salvas desta sessão serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar valores originais?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os campos voltam ao template original. Você ainda precisa salvar para
              aplicar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={draftPrompt !== null}
        onOpenChange={(o) => !o && setDraftPrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos alterações não salvas de uma sessão anterior. Deseja
              restaurá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDraftPrompt(null)}>
              Descartar rascunho
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (draftPrompt) setConfig(draftPrompt);
                setDraftPrompt(null);
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogPrimitive.Root>
  );
}
