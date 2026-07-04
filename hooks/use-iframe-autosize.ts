import { useCallback, useRef } from "react";

/**
 * Ajusta a altura de um iframe de preview ao conteúdo renderizado.
 * Use `iframeRef` no elemento e `onLoad` no evento `onLoad` do iframe.
 */
export function useIframeAutosize() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;
    const doc = iframe.contentDocument;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
    if (h > 0) iframe.style.height = `${h + 4}px`;
  }, []);

  return { iframeRef, onLoad };
}
