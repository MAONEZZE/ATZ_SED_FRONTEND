"use client";

import { useLoginBackground } from "@/hooks/use-login-background";

export function AuthBackground() {
  const { url } = useLoginBackground();
  return (
    <>
      <img
        src={url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scale(0.95)", transformOrigin: "center" }}
      />
      <div className="absolute inset-0 bg-black/65" aria-hidden />
    </>
  );
}
