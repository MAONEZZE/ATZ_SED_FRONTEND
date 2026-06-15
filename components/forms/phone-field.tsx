"use client";

import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input/core";
import labels from "react-phone-number-input/locale/pt-BR.json";
import "react-phone-number-input/style.css";
import { phoneMetadata } from "@/lib/phone/metadata";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PhoneTextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function PhoneTextInput(props, ref) {
  return <Input ref={ref} {...props} />;
});

export function PhoneField({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <PhoneInput
      id={id}
      international
      defaultCountry="BR"
      metadata={phoneMetadata}
      labels={labels}
      disabled={disabled}
      value={value || undefined}
      onChange={(v) => onChange(v ?? "")}
      inputComponent={PhoneTextInput}
      className={cn("phone-field flex items-center gap-2", className)}
    />
  );
}
