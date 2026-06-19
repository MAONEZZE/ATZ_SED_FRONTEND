"use client";

import Image from "next/image";
import { useLoginBackground } from "@/hooks/use-login-background";

export function AuthBackground() {
  const { url } = useLoginBackground();
  return (
    <>
      <Image
        src={url}
        alt=""
        fill
        priority
        quality={90}
        className="object-cover"
        aria-hidden
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </>
  );
}
