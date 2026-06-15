"use client";

import { useRef, useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";

const VAR_SPLIT = /(\{\{[^}]*\}\})/g;

type VariableTextareaProps = Omit<React.ComponentProps<"textarea">, "onChange"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

const SHARED = "min-h-[60px] w-full rounded-md px-3 py-2 text-base md:text-sm";

export const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  function VariableTextarea({ value, onChange, className, ...props }, forwardedRef) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const mergedRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            node;
      },
      [forwardedRef],
    );

    function syncScroll() {
      const ta = innerRef.current;
      const bd = backdropRef.current;
      if (ta && bd) bd.scrollTop = ta.scrollTop;
    }

    const parts = value.split(VAR_SPLIT);

    return (
      <div className="relative">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={cn(
            SHARED,
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words",
            className,
          )}
        >
          {parts.map((part, i) =>
            part.startsWith("{{") && part.endsWith("}}") ? (
              <mark key={i} className="rounded bg-primary/20 not-italic text-primary">
                {part}
              </mark>
            ) : (
              part
            ),
          )}
          {"\n"}
        </div>

        <textarea
          ref={mergedRef}
          value={value}
          onChange={onChange}
          onScroll={syncScroll}
          className={cn(
            SHARED,
            "border border-input bg-transparent shadow-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "relative z-10 resize-none",
            "[caret-color:hsl(var(--foreground))] [color:transparent]",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
