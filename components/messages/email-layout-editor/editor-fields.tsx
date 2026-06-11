"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditorField } from "./editor-schema";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[58px] resize-y text-sm"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  // Buffer de texto local para permitir digitação parcial sem corromper o estado.
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  function commitText(raw: string) {
    const next = raw.startsWith("#") ? raw : `#${raw}`;
    setText(next);
    if (HEX_RE.test(next)) onChange(next.toLowerCase());
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (seletor)`}
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={text}
          onChange={(e) => commitText(e.target.value)}
          spellCheck={false}
          className="font-mono text-sm uppercase"
        />
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between py-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <TextField
          label={field.label}
          value={String(value)}
          onChange={onChange}
        />
      );
    case "textarea":
      return (
        <TextField
          label={field.label}
          value={String(value)}
          onChange={onChange}
          multiline
        />
      );
    case "color":
      return (
        <ColorField
          label={field.label}
          value={String(value)}
          onChange={onChange}
        />
      );
    case "range":
      return (
        <RangeField
          label={field.label}
          value={Number(value)}
          onChange={onChange}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step}
          unit={field.unit}
        />
      );
    case "toggle":
      return (
        <ToggleField
          label={field.label}
          value={Boolean(value)}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectField
          label={field.label}
          value={String(value)}
          onChange={onChange}
          options={field.options ?? []}
        />
      );
    default:
      return null;
  }
}
