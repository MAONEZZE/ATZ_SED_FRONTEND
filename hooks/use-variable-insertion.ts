import { useRef } from "react";

/**
 * Insere um token `{{variavel}}` na posição do cursor de um textarea, ou o
 * anexa ao final quando o textarea não está montado. Use `textareaRef` no
 * textarea e chame `insertVariable(nome)`.
 */
export function useVariableInsertion(
  value: string,
  setValue: (next: string) => void,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    const ta = textareaRef.current;
    if (!ta) {
      setValue(value + token);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return { textareaRef, insertVariable };
}
