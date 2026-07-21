"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { ImagePlus } from "lucide-react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function ImageField({
  value,
  onChange,
  disabled,
  inputId,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Clique para enviar uma imagem"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Imagem enviada"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!disabled && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-transparent transition-all group-hover:bg-black/55 group-hover:text-white">
                Clique para trocar a imagem
              </span>
            )}
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Clique para enviar uma imagem</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}
