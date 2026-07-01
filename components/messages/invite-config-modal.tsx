"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type InviteConfig,
  type InviteRecurrence,
  CUSTOM_FREQ_OPTIONS,
  DEFAULT_TIMEZONE,
  formatInviteDate,
  recurrenceOptions,
  timezoneLabel,
  TIMEZONE_OPTIONS,
} from "@/lib/messages/invite-config";
import type { InviteRecurrencePayload } from "@/lib/api/types";

function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function defaultConfig(): InviteConfig {
  return {
    date: todayIso(),
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    timezone: DEFAULT_TIMEZONE,
    recurrence: "none",
    customFreq: "WEEKLY",
    interval: 1,
    until: "",
  };
}

export function InviteConfigModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: InviteConfig | null;
  onSave: (config: InviteConfig) => void;
}) {
  const [config, setConfig] = useState<InviteConfig>(defaultConfig);

  useEffect(() => {
    if (open) setConfig(initial ?? defaultConfig());
  }, [open, initial]);

  function set<K extends keyof InviteConfig>(key: K, value: InviteConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const refDate = config.date ? new Date(`${config.date}T12:00:00`) : new Date();
  const options = recurrenceOptions(config.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Configurar invite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data e horário */}
          <div className="space-y-2">
            <Label>Data</Label>
            <DateTimePicker
              mode="date"
              value={config.date}
              onChange={(v) => set("date", v)}
            />
            <p className="text-xs text-muted-foreground">{formatInviteDate(config.date)}</p>
          </div>

          {!config.allDay && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-start">Início</Label>
                <Input
                  id="invite-start"
                  type="time"
                  value={config.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
              <span className="pb-2 text-muted-foreground">–</span>
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-end">Fim</Label>
                <Input
                  id="invite-end"
                  type="time"
                  value={config.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Opções */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={config.allDay}
                onCheckedChange={(c) => set("allDay", c === true)}
              />
              Dia inteiro
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fuso</span>
              <Select value={config.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger className="h-8 w-auto gap-1.5">
                  <SelectValue>{timezoneLabel(config.timezone, refDate)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz} ({timezoneLabel(tz, refDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select
              value={config.recurrence}
              onValueChange={(v) => set("recurrence", v as InviteRecurrence)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.recurrence === "custom" && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-interval">A cada</Label>
                  <Input
                    id="invite-interval"
                    type="number"
                    min={1}
                    className="w-20"
                    value={config.interval}
                    onChange={(e) =>
                      set("interval", Math.max(1, Number(e.target.value) || 1))
                    }
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-freq">Unidade</Label>
                  <Select
                    value={config.customFreq}
                    onValueChange={(v) =>
                      set("customFreq", v as InviteRecurrencePayload["freq"])
                    }
                  >
                    <SelectTrigger id="invite-freq">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_FREQ_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Repetir até</Label>
                <DateTimePicker
                  mode="date"
                  value={config.until}
                  onChange={(v) => set("until", v)}
                  placeholder="Sem data final"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para repetir indefinidamente.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave(config);
              onOpenChange(false);
            }}
          >
            Salvar invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
