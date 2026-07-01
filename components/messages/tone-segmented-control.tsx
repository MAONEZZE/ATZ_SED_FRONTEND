"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

export interface ToneOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control (radiogroup) para seleção mutuamente exclusiva de tom.
 * Navegável por teclado via primitivas do Radix.
 */
export function ToneSegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: T | null;
  onValueChange: (value: T) => void;
  options: ToneOption<T>[];
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? ""}
      onValueChange={(v) => onValueChange(v as T)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border bg-muted/50 p-0.5"
    >
      {options.map((opt) => (
        <RadioGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm",
          )}
        >
          {opt.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
