"use client";

import type { RefObject } from "react";
import { EMAIL_PREVIEW_MIN_HEIGHT } from "@/lib/messages/composer-constants";

/** Preview do corpo HTML do e-mail num iframe sandboxed com autosize. */
export function EmailBodyPreview({
  body,
  iframeRef,
  onLoad,
}: {
  body: string;
  iframeRef: RefObject<HTMLIFrameElement>;
  onLoad: () => void;
}) {
  return (
    <iframe
      ref={iframeRef}
      srcDoc={body}
      title="preview do e-mail"
      scrolling="no"
      className="block w-full overflow-hidden bg-white"
      style={{ minHeight: EMAIL_PREVIEW_MIN_HEIGHT }}
      sandbox="allow-same-origin"
      onLoad={onLoad}
    />
  );
}
