import { Fragment, type ReactNode } from "react";

/**
 * Renders a message string with simple inline markup:
 * `*palavra*` becomes bold. Line breaks are preserved by the
 * caller via `whitespace-pre-line`.
 */
export function renderRichText(text: string): ReactNode {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <span className={className}>{renderRichText(text)}</span>;
}
